import { AxiosError } from 'axios'
import { Request } from 'express'
import { HydratedDocument, Schema } from 'mongoose'
import env from '../config/env'
import { OnboardingTypes, QiTechClient, QiTechTypes } from '../infra'
import { AnalysisStatus } from '../infra/onboarding/Onboarding.types'
import {
    AccountStatus,
    AccountType,
    IAccount,
    IApiUser,
    IOnboarding,
    NotFoundError,
    PixKeyType,
    PixStatus,
    ValidationError,
} from '../models'
import {
    AccountRepository,
    ApiUserRepository,
    BillingConfigurationRepository,
    FileRepository,
    OnboardingRepository,
    PixKeyRepository,
} from '../repository'
import { maskCNAE, unMask } from '../utils/masks'
import { IPaginatedSearch } from '../utils/pagination'
import { NotificationService } from './Notification.service'
import { OnboardingService } from './Onboarding.service'
import { IBillingConfiguration } from '../models/BillingConfiguration.model'

export class QiTechService {
    private static instance: QiTechService
    private readonly client: QiTechClient
    private readonly fileRepository: FileRepository
    private readonly analysisToAproveOnboarding: AnalysisStatus[] = [
        AnalysisStatus.AUTOMATICALLY_APPROVED,
        AnalysisStatus.MANUALLY_APPROVED,
    ]

    constructor() {
        this.client = new QiTechClient({
            apiKey: env.QITECH_API_KEY,
            baseUrl: env.QITECH_BASE_URL,
            privateKey: env.QITECH_PRIVATE_KEY,
            passphrase: env.QITECH_PRIVATE_KEY_PASSPHRASE,
            qiPublicKey: env.QITECH_PUBLIC_KEY,
        })
        this.fileRepository = FileRepository.getInstance()
    }

    public static getInstance(): QiTechService {
        if (!QiTechService.instance) {
            QiTechService.instance = new QiTechService()
        }
        return QiTechService.instance
    }

    public async createAccount(document: string, payload: QiTechTypes.Account.ICreate, apiUser: HydratedDocument<IApiUser>) {
        const accountRepository = AccountRepository.getInstance()
        const onboardingService = OnboardingService.getInstance()

        const accountType = unMask(document).length === 11 ? AccountType.PF : AccountType.PJ
        const callbackURL = payload.callbackURL || ''
        delete payload.callbackURL
        this.formatPayload(payload)

        let account = await accountRepository.getByDocument(document)
        if (account && account.status !== AccountStatus.FAILED) {
            throw new ValidationError('Existing account found for this document')
        }

        if (account) {
            account.callbackURL = callbackURL
            account.request = payload
            account.status = AccountStatus.PENDING
            account.markModified('request')
            account.markModified('data')
        } else {
            account = await accountRepository.create({
                callbackURL,
                document: document,
                request: payload,
                status: AccountStatus.PENDING,
                type: accountType,
                apiUserId: apiUser.id,
            })
        }

        const onboardingData = onboardingService.mapQiTechPayload(payload)
        const onboarding = await onboardingService.createOnboarding(onboardingData, account.id)

        if (onboarding.status !== OnboardingTypes.RequestStatus.APPROVED) {
            account.status = AccountStatus.PENDING
            await account.save()
            throw new ValidationError('Onboarding failed or is pending')
        }

        try {
            account.response = await this.client.createAccount(payload)
            account.markModified('response')
            await account.save()
        } catch (error) {
            account.status = AccountStatus.FAILED
            await account.save()
            throw error
        }

        return account
    }

    public async handleAccountCreation() {
        const accountRepository = AccountRepository.getInstance()
        const userRepository = ApiUserRepository.getInstance()

        const accounts: IPaginatedSearch<IAccount> = await accountRepository.list(1, '', AccountStatus.PENDING)

        if (accounts.count == 0) return

        for (let index = 0; index < accounts.count; index++) {
            try {
                let account = accounts.data[index]
                if (!account) throw new NotFoundError('Account not found for this document')

                account = await this.updateAccountWithQi(account)

                if (!account?.data) throw new Error('Account data not found')

                await this.createPixKey({
                    account_key: (account.data as QiTechTypes.Account.IList).account_key as string,
                    pix_key_type: PixKeyType.RANDOM_KEY,
                })

                const apiUser = await userRepository.getById(account.apiUserId)
                if (!apiUser) throw new NotFoundError('User not found for this account')

                const notificationService = NotificationService.getInstance()
                const notification = await notificationService.create(
                    {
                        ...account.toJSON(),
                        pixKeys: [],
                    },
                    account.callbackURL,
                    apiUser
                )
                notificationService.notify(notification)
            } catch (error) {
                console.log(error)
            }
        }
    }

    public async handlePendingAnalysis() {
        const onboardingRepository = OnboardingRepository.getInstance()
        const accountRepository = AccountRepository.getInstance()
        const onboardingService = OnboardingService.getInstance()

        const onboardings: IPaginatedSearch<IOnboarding> = await onboardingRepository.list(1, OnboardingTypes.RequestStatus.PENDING)

        if (onboardings.count == 0) return

        for (let index = 0; index < onboardings.count; index++) {
            const onboarding = onboardings.data[index]

            const updatedAnalysis: OnboardingTypes.ILegalPersonGetResponse | OnboardingTypes.INaturalPersonGetResponse =
                await onboardingService.getAnalysis(onboarding)

            if (this.analysisToAproveOnboarding.includes(updatedAnalysis.analysis_status)) {
                const account = await accountRepository.getByDocument(onboarding.document)

                if (!account) {
                    throw new NotFoundError('Account not found for this document')
                }

                await this.createAccountOnboardingOk(
                    onboarding.document,
                    account?.request as QiTechTypes.Account.ICreate,
                    account.apiUserId
                )
                await onboardingService.updateOnboarding(onboarding)
            }
        }
    }

    public async createAccountOnboardingOk(document: string, payload: QiTechTypes.Account.ICreate, apiUserId: Schema.Types.ObjectId) {
        const userRepository = ApiUserRepository.getInstance()
        const apiUser = await userRepository.getById(apiUserId)
        if (!apiUser) throw new NotFoundError('User not found for this account')

        const accountRepository = AccountRepository.getInstance()

        this.formatPayload(payload)

        const account = await accountRepository.getByDocument(document)
        if (account == null) throw new ValidationError('Existing account found for this document')

        try {
            const response = await this.client.createAccount(payload)

            if (response) {
                account.response = response
                account.request = payload
            }

            account.markModified('response')
            await account.save()
        } catch (error) {
            const qiTechService = QiTechService.getInstance()
            const erroDecodificado = await qiTechService.decodeError(error)

            account.status = AccountStatus.FAILED
            await account.save()
            throw erroDecodificado
        }

        return account
    }

    public async createPixKey(payload: QiTechTypes.Pix.ICreatePix) {
        const pixRepository = PixKeyRepository.getInstance()
        const accountRepository = AccountRepository.getInstance()
        const apiUserRepository = ApiUserRepository.getInstance()

        const account = await accountRepository.getByAccountKey(payload.account_key)
        if (!account) {
            throw new ValidationError('No account found for this document')
        }

        const apiUser = await apiUserRepository.getById(account?.apiUserId)
        if (!apiUser) {
            throw new ValidationError('No user found for this account')
        }
        let pix = await pixRepository.getByDocumentAndKeyType(account.document, payload.pix_key_type)

        if (pix && pix.status !== PixStatus.FAILED) {
            throw new ValidationError('Existing pix key found for this account and key type')
        }

        const pixResponse = await this.client.createPixKey(payload)
        if (pix) {
            pix.status = PixStatus.PENDING
            pix.request = payload
            pix.response = pixResponse
            pix.type = payload.pix_key_type
            pix.document = account.document
            await pix.save()
        } else {
            pix = await pixRepository.create({
                accountId: account.id,
                document: account.document,
                request: payload,
                response: pixResponse,
                type: payload.pix_key_type,
                status: PixStatus.PENDING,
            })
        }

        const notificationService = NotificationService.getInstance()
        const notification = await notificationService.create(
            {
                ...account.toJSON(),
                pixKeys: [pix],
            },
            account.callbackURL,
            apiUser
        )
        notificationService.notify(notification)

        return pix
    }

    public async handlePixWebhook(payload: QiTechTypes.Pix.IPixKeyWebhook) {
        const pixRepository = PixKeyRepository.getInstance()
        const accountRepository = AccountRepository.getInstance()
        const apiUserRepository = ApiUserRepository.getInstance()

        const pix = await pixRepository.getByRequestKey(payload.pix_key_request_key)
        if (!pix) {
            throw new NotFoundError('Pix not found for this key')
        }

        const account = await accountRepository.getById(pix.accountId)
        if (!account) {
            throw new NotFoundError('Account not found for this key')
        }

        const apiUser = await apiUserRepository.getById(account.apiUserId)
        if (!apiUser) {
            throw new NotFoundError('User not found for this account')
        }

        if (payload.pix_key_request_status !== QiTechTypes.Pix.IPixKeyStatus.SUCCESS) {
            pix.status = PixStatus.FAILED
        } else {
            pix.status = PixStatus.SUCCESS
            pix.key = payload.pix_key
        }
        pix.data = payload
        await pix.save()

        const notificationService = NotificationService.getInstance()
        const notification = await notificationService.create(
            {
                ...account.toJSON(),
                pixKeys: [pix],
            },
            account.callbackURL,
            apiUser
        )
        notificationService.notify(notification)

        return pix
    }

    public async handlePixLimitWebhook(payload: QiTechTypes.Pix.IPixLimitRequestWebhook) {
        const accountRepository = AccountRepository.getInstance()
        const apiUserRepository = ApiUserRepository.getInstance()

        const account = await accountRepository.getById(payload.origin_key)
        if (!account) {
            throw new NotFoundError('Account not found for this key')
        }

        const apiUser = await apiUserRepository.getById(account.apiUserId)
        if (!apiUser) {
            throw new NotFoundError('User not found for this account')
        }

        // Você pode fazer mais lógica aqui, se necessário
        const notificationService = NotificationService.getInstance()
        const notification = await notificationService.create(
            {
                ...account.toJSON(),
                pixLimits: payload.data.pix_transfer_limit_config,
            },
            account.callbackURL,
            apiUser
        )

        notificationService.notify(notification)

        console.log('Pix Limit Webhook Payload:', payload.data.pix_transfer_limit_config)
    }

    public async updateAccountWithQi(account: HydratedDocument<IAccount>): Promise<HydratedDocument<IAccount>> {
        const updatedAccount = (await this.client.listAccounts(account.document)).data.find(
            acc => acc.account_number === account.response?.data.account_info.account_number
        )

        if (updatedAccount) {
            account.data = updatedAccount
            account.status = AccountStatus.SUCCESS
            account.markModified('data')
        }

        await account.save()

        return account
    }

    public async uploadFile(document: string, type: string, fileName: string, file: Buffer) {
        const existingFile = await this.fileRepository.findOne(document, type)
        if (existingFile) {
            throw new ValidationError('Found existing file with same document and type')
        }

        const upload = await this.client.uploadFile(fileName, file)
        const doc = await this.fileRepository.create({
            data: upload,
            document: document,
            type: type,
        })

        return doc
    }

    public authenticateWebhook(req: Request): void {
        const webhookKey = req.headers['villela-key']
        if (!webhookKey || webhookKey !== env.QITECH_WEBHOOK_SECRET) {
            // throw new UnauthorizedError()
        }
    }

    public async handleWebhook(req: Request): Promise<void> {
        const { headers, body } = req
        if (!body.encoded_body) {
            throw new ValidationError('Invalid Body')
        }

        const decodedBody = await this.client.decodeMessage<QiTechTypes.Common.IWebhook>('/webhook/account', 'POST', headers, body)

        switch (decodedBody.webhook_type) {
            case 'account':
                await this.handleAccountWebhook(decodedBody as QiTechTypes.Account.IAccountWebhook)
                break
            case 'key_inclusion':
                await this.handlePixWebhook(decodedBody as QiTechTypes.Pix.IPixKeyWebhook)
                break
            case 'account_transaction':
                await this.handleAccountWebhook(decodedBody as QiTechTypes.Account.IAccountWebhook)
                break
            case 'baas.pix.limits.account_limit_config.updated':
                await this.handlePixLimitWebhook(decodedBody as QiTechTypes.Pix.IPixLimitRequestWebhook)
                break
            default:
                break
        }
    }

    private async handleAccountWebhook(decodedBody: QiTechTypes.Account.IAccountWebhook) {
        let account = await AccountRepository.getInstance().getByRequestKey(decodedBody.key)
        if (!account) {
            throw new NotFoundError('Account not found for this key')
        } else if (account.status === AccountStatus.SUCCESS) {
            return account
        }
        const apiUser = await ApiUserRepository.getInstance().getById(account.apiUserId)
        if (!apiUser) {
            throw new Error('User not found for Account')
        }
        const updatedStatus = this.mapStatus(decodedBody.status)
        account.status = updatedStatus

        if (updatedStatus === AccountStatus.SUCCESS) {
            account = await this.updateAccountWithQi(account)
        }
        await account.save()

        if (updatedStatus === AccountStatus.SUCCESS && account.data) {
            await this.createPixKey({
                account_key: (account.data as QiTechTypes.Account.IList).account_key as string,
                pix_key_type: PixKeyType.RANDOM_KEY,
            })
        }

        const notificationService = NotificationService.getInstance()
        const notification = await notificationService.create(
            {
                ...account.toJSON(),
                pixKeys: [],
            },
            account.callbackURL,
            apiUser
        )
        notificationService.notify(notification)

        return account
    }

    public async decodeError(error: unknown) {
        try {
            if (!(error instanceof AxiosError)) {
                return error
            }

            if (!error.response) {
                return error
            }

            const { headers, data } = error.response
            const url = error.config?.url
            const baseURL = error.config?.baseURL
            const method = error.config?.method
            if (!headers || !data || !url || !method || baseURL !== env.QITECH_BASE_URL) {
                return error
            }

            const decoded = await this.client.decodeMessage(url, method.toUpperCase(), headers, data)
            error.response.data = decoded
            return error
        } catch (err) {
            return error
        }
    }

    private formatPayload(payload: QiTechTypes.Account.ICreate): void {
        if ('trading_name' in payload.account_owner) {
            payload.account_owner.cnae_code = maskCNAE(payload.account_owner.cnae_code)
        }
    }

    private mapStatus(status: QiTechTypes.Account.AccountStatus): AccountStatus {
        switch (status) {
            case QiTechTypes.Account.AccountStatus.ERROR:
                return AccountStatus.FAILED
            case QiTechTypes.Account.AccountStatus.PENDING:
                return AccountStatus.PENDING
            case QiTechTypes.Account.AccountStatus.SUCCESS:
                return AccountStatus.SUCCESS
            case QiTechTypes.Account.AccountStatus.CLOSED:
                return AccountStatus.CLOSED
            default:
                return AccountStatus.FAILED
        }
    }

    public async listAllAccounts(page: number, pageSize: number) {
        const result = await this.client.listAllAccounts(page, pageSize)

        const mappedData = result.data.map(account => ({
            account_key: account.account_key,
            account_number: account.account_number,
            account_digit: account.account_digit,
            owner_name: account.owner_name,
            owner_document_number: account.owner_document_number,
            created_at: account.created_at,
        }))

        const sortedData = mappedData.sort((a, b) => {
            if (a.created_at < b.created_at) return -1
            if (a.created_at > b.created_at) return 1

            return a.owner_name.localeCompare(b.owner_name)
        })

        return {
            total: sortedData.length,
            data: sortedData,
            pagination: result.pagination,
        }
    }

    public async cancelAccount(accountKey: string) {
        const result = await this.client.cancelAccount(accountKey)
        // const account = await AccountRepository.getInstance().getByAccountKey(accountKey)
        // if (!account) {
        //     throw new NotFoundError('Account not found for this key')
        // }
        // account.status = AccountStatus.CLOSED
        // await account.save()
        return {
            message: 'Account successfully canceled',
            data: result,
        }
    }

    public async getAccountQITech(accountKey: string, page: number, pageSize: number) {
        const result = await this.client.getAccountsByKey(accountKey, page, pageSize)

        return {
            data: result,
        }
    }

    public async getPixLimitsByDocument(document: string) {
        const accountRepository = AccountRepository.getInstance()
        const account = await accountRepository.getByDocument(document)
        if (!account) {
            throw new ValidationError('No account found for this document')
        }

        const accountKey = (account.data as QiTechTypes.Account.IList).account_key

        const limits = await this.client.getLimitsByAccountKey(accountKey)
        return limits
    }

    public async updatePixLimits(document: string, pixLimits: Partial<QiTechTypes.Pix.IPixLimits>) {
        const accountRepository = AccountRepository.getInstance()
        const account = await accountRepository.getByDocument(document)
        if (!account) {
            throw new ValidationError('No account found for this document')
        }

        const accountKey = (account.data as QiTechTypes.Account.IList).account_key

        const requestBody = {
            ...pixLimits,
        }

        const response = await this.client.updatePixLimits(accountKey, requestBody)
        return response
    }

    public async getPixLimitsRequestByDocument(
        document: string,
        requestStatus: QiTechTypes.Pix.IPixRequestStatus,
        page = 1,
        pageSize = 10
    ) {
        const accountRepository = AccountRepository.getInstance()
        const account = await accountRepository.getByDocument(document)

        if (!account) {
            throw new Error('No account found for this document.')
        }

        const accountKey = (account.data as QiTechTypes.Account.IList).account_key

        return await this.client.getPixLimitsRequest(accountKey, requestStatus, page, pageSize)
    }

    public async updatePhoneNumber(document: string, phoneNumber: QiTechTypes.Account.IPhone, email: string) {
        const requestBody: QiTechTypes.Person.IUpdate = {
            contact_type: 'sms',
            professional_data_contact_update: {
                professional_data_key: '2881681f-7064-468a-a494-8d33d5b94e38',
                natural_person: '2881681f-7064-468a-a494-8d33d5b94e38',
                email: email,
                phone_number: phoneNumber,
            },
            agent_document_number: document,
        }

        const response = await this.client.requestToken(requestBody)
        return response
    }

    public async getBillingConfigurationByDocument(document: string) {
        const accountRepository = AccountRepository.getInstance()
        const account = await accountRepository.getByDocument(document)
        if (!account) {
            throw new ValidationError('Não foi encontrada conta para esse documento')
        }
        const accountKey = (account.data as QiTechTypes.Account.IList).account_key

        return await this.client.getBillingConfigurationByAccountKey(accountKey)
    }

    public async updateBillingConfigurationByDocument(document: string, billingConfiguration: Partial<IBillingConfiguration>) {
        const accountRepository = AccountRepository.getInstance()
        const account = await accountRepository.getByDocument(document)
        if (!account) {
            throw new ValidationError('Não foi encontrada conta para esse documento')
        }

        const template = await BillingConfigurationRepository.getInstance().get()
        if (!template) {
            throw new Error('Template not found')
        }
        const accountKey = (account.data as QiTechTypes.Account.IList).account_key

        const { billing_configuration_data: templateData } = template

        // Merge the template and the billingConfiguration
        const mergedBillingConfigurationData = {
            ...templateData,
            ...billingConfiguration.billing_configuration_data,
        }

        // Replace billing_account_key in all relevant sections
        const sections: Array<keyof typeof mergedBillingConfigurationData> = ['bankslip', 'ted', 'pix', 'account_maintenance']
        for (const section of sections) {
            if (mergedBillingConfigurationData[section]) {
                (mergedBillingConfigurationData[section] as ISectionData).billing_account_key = accountKey
            }
        }

        // Create the final merged data
        const mergedData = {
            billing_configuration_data: mergedBillingConfigurationData,
        }

        return await this.client.updateBillingConfigurationByAccountKey(accountKey, mergedData)
    }
}

interface ISectionData {
    billing_account_key: string
    // Add other fields as necessary
}
