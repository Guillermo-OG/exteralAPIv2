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
import { IBillingConfiguration } from '../models/BillingConfiguration.model'
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
import { deepMerge } from '../utils/scripts/DeepMerge.script'
import { NotificationService } from './Notification.service'
import { OnboardingService } from './Onboarding.service'

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
            billingAccountKey: env.BILLING_ACCOUNT_KEY,
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
            throw new ValidationError('Conta com status pendente. Verificar portal Zaig pois ela pode estar pendente de aprovação.')
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
            throw new ValidationError('Onboarding falhou ou est� pendente')
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
                if (!account) throw new NotFoundError('Conta existente encontrada para este documento')

                account = await this.updateAccountWithQi(account)

                if (!account?.data) throw new Error('Dados da Conta não encontrados')

                await this.createPixKey({
                    account_key: (account.data as QiTechTypes.Account.IList).account_key as string,
                    pix_key_type: PixKeyType.RANDOM_KEY,
                })

                const apiUser = await userRepository.getById(account.apiUserId)
                if (!apiUser) throw new NotFoundError('Nenhum usuário encontrado para esta conta')

                const notificationService = NotificationService.getInstance()
                const notification = await notificationService.create(
                    {
                        ...account.toJSON(),
                    },
                    account.callbackURL,
                    apiUser
                )
                notificationService.notify(notification)
            } catch (error) {
                console.log(error)
                throw error
            }
        }
    }

    public async handlePendingAnalysis() {
        const onboardingRepository = OnboardingRepository.getInstance()
        const accountRepository = AccountRepository.getInstance()
        const onboardingService = OnboardingService.getInstance()

        const onboardings: IPaginatedSearch<IOnboarding> = await onboardingRepository.list(1, OnboardingTypes.RequestStatus.PENDING)

        if (onboardings.count == 0) return

        for (let index = 0; index <= onboardings.count; index++) {
            const onboarding = onboardings.data[index]

            try {
                if (onboarding == null) return

                const updatedAnalysis: OnboardingTypes.ILegalPersonGetResponse | OnboardingTypes.INaturalPersonGetResponse =
                    await onboardingService.getAnalysis(onboarding)

                if (this.analysisToAproveOnboarding.includes(updatedAnalysis.analysis_status)) {
                    const account = await accountRepository.getByDocument(onboarding.document)

                    if (!account) {
                        throw new NotFoundError('Nenhuma conta encontrada para este documento')
                    }

                    try {
                        await this.createAccountOnboardingOk(
                            onboarding.document,
                            account?.request as QiTechTypes.Account.ICreate,
                            account.apiUserId
                        )
                        await onboardingService.updateOnboarding(onboarding)
                    } catch (error) {
                        console.log('erro na criacao de conta (onboardingAprovado)', { documento: account.document, erro: error })
                        throw error
                    }
                }
            } catch (error) {
                console.log('onboarding com erro:', { onboarding, error })
                throw error
            }
        }
    }

    public async createAccountOnboardingOk(document: string, payload: QiTechTypes.Account.ICreate, apiUserId: Schema.Types.ObjectId) {
        const userRepository = ApiUserRepository.getInstance()
        const apiUser = await userRepository.getById(apiUserId)
        if (!apiUser) throw new NotFoundError('Nenhum usu�rio encontrado para esta conta')

        const accountRepository = AccountRepository.getInstance()

        this.formatPayload(payload)

        const account = await accountRepository.getByDocument(document)
        if (account == null) throw new ValidationError('Conta existente encontrada para este documento')

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
            throw new ValidationError('Nenhuma conta encontrada para este documento')
        }

        const apiUser = await apiUserRepository.getById(account?.apiUserId)
        if (!apiUser) {
            throw new ValidationError('Nenhum usu�rio encontrado para esta conta')
        }
        let pix = await pixRepository.getByDocumentAndKeyType(account.document, payload.pix_key_type)

        if (pix && pix.status !== PixStatus.FAILED) {
            throw new ValidationError('Chave Pix existente encontrada para esta conta e tipo de chave')
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
            throw new NotFoundError('Pix não encontrado para esta chave')
        }

        const account = await accountRepository.getById(pix.accountId)
        if (!account) {
            throw new NotFoundError('Conta não encontrada para esta chave')
        }

        const apiUser = await apiUserRepository.getById(account.apiUserId)
        if (!apiUser) {
            throw new NotFoundError('Usuário não encontrado para esta conta')
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
        // Repositories
        const accountRepository = AccountRepository.getInstance()
        const apiUserRepository = ApiUserRepository.getInstance()

        // Initial Diagnostic Logging
        console.log('Pix Limit Webhook Payload:', payload)

        if (!payload || !payload.data || !payload.data.pix_transfer_limit_config) {
            throw new NotFoundError('Payload incompleto ou estrutura inesperada')
        }

        console.log('Pix Limit Webhook Payload:', payload.data.pix_transfer_limit_config[0])

        const accountKey = payload.data.pix_transfer_limit_config[0].account_key

        // Check Account Key
        if (!accountKey) {
            throw new NotFoundError('O payload não tem nenhum objeto "account_key"')
        }

        // Check Account
        const account = await accountRepository.getByAccountKey(accountKey)
        if (!account) {
            throw new NotFoundError(`Conta não encontrada para a chave ${accountKey}`)
        }

        // Check API User
        const apiUser = await apiUserRepository.getById(account.apiUserId)
        if (!apiUser) {
            throw new NotFoundError(`Usuário não encontrado para a conta com a chave ${accountKey}`)
        }

        // Notification Handling
        const notificationService = NotificationService.getInstance()
        const notification = await notificationService.create(payload.data.pix_transfer_limit_config, account.callbackURL, apiUser)

        notificationService.notify(notification)
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
            throw new ValidationError('Arquivo existente encontrado com o mesmo documento e tipo')
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
        try {
            const { headers, body } = req
            if (!body.encoded_body) {
                throw new ValidationError('Corpo da requisição inválido.')
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
        } catch (err) {
            console.error('Erro webhooks', err)
            throw err
        }
    }

    private async handleAccountWebhook(decodedBody: QiTechTypes.Account.IAccountWebhook) {
        try {
            let account = await AccountRepository.getInstance().getByRequestKey(decodedBody.key)
            if (!account) {
                throw new NotFoundError('Conta não encontrada para esta chave')
            } else if (account.status === AccountStatus.SUCCESS) {
                return account
            }
            const apiUser = await ApiUserRepository.getInstance().getById(account.apiUserId)
            if (!apiUser) {
                throw new Error('Usuário não encontrado para esta conta')
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
                },
                account.callbackURL,
                apiUser
            )
            notificationService.notify(notification)

            return account
        } catch (err) {
            console.error('Erro webhook account', err)
            throw err
        }
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
            message: 'Conta cancelada com sucesso',
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
            throw new ValidationError('Conta não encontrada para este documento')
        }

        const accountKey = (account.data as QiTechTypes.Account.IList).account_key

        const limits = await this.client.getLimitsByAccountKey(accountKey)
        return limits
    }

    public async updatePixLimits(document: string, pixLimits: Partial<QiTechTypes.Pix.IPixLimits>) {
        const accountRepository = AccountRepository.getInstance()
        const account = await accountRepository.getByDocument(document)
        if (!account) {
            throw new ValidationError('Conta não encontrada para este documento')
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
            throw new Error('Conta não encontrada para este documento.')
        }

        const accountKey = (account.data as QiTechTypes.Account.IList).account_key

        return await this.client.getPixLimitsRequest(accountKey, requestStatus, page, pageSize)
    }

    public async updatePhoneNumber(document: string, phoneNumber: QiTechTypes.Account.IPhone, email: string) {
        const requestBody: QiTechTypes.Person.IUpdate = {
            contact_type: 'sms',
            professional_data_contact_update: {
                professional_data_key: '',
                natural_person: '',
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
            throw new ValidationError('Não foi encontrada conta para esse documento.')
        }

        const accountKey = (account.data as QiTechTypes.Account.IList).account_key
        return await this.client.getBillingConfigurationByAccountKey(accountKey)
    }

    public async updateBillingConfigurationByDocument(document: string, billingConfiguration: Partial<IBillingConfiguration>) {
        const accountRepository = AccountRepository.getInstance()
        const billingRepo = BillingConfigurationRepository.getInstance()

        if (!billingConfiguration.billing_configuration_data) {
            throw new ValidationError('Favor informar o campo que deseja alterar')
        }

        const account = await accountRepository.getByDocument(document)
        if (!account) {
            throw new ValidationError('Não foi encontrada conta para esse documento')
        }
        const accountKey = (account.data as QiTechTypes.Account.IList).account_key
        const existingBillingConfiguration = (await billingRepo.get(document))?.toObject()

        if (!existingBillingConfiguration) {
            return this.setDefaultBillingConfiguration(document)
        } else {
            const { billing_configuration_data: billing_configuration_data } = existingBillingConfiguration

            const mergedBillingConfigurationData = deepMerge(billing_configuration_data, billingConfiguration.billing_configuration_data)

            //apaga campos não admitidos (regra QITECH)
            if (mergedBillingConfigurationData.pix?.pix_fees) {
                delete mergedBillingConfigurationData.pix.pix_fees.outgoing_pix_external_service
                delete mergedBillingConfigurationData.pix.pix_fees.outgoing_pix_chargeback
            }

            // Determine which billing_account_key to use
            const billingAccountKeyToUse = env.BILLING_ACCOUNT_KEY === 'user' ? accountKey : env.BILLING_ACCOUNT_KEY

            // Replace billing_account_key in all relevant sections
            const sections: Array<keyof typeof mergedBillingConfigurationData> = ['bankslip', 'ted', 'pix', 'account_maintenance']

            for (const section of sections) {
                if (mergedBillingConfigurationData[section]) {
                    // por algum motivo a linha abaixo não deveria ter semi-colon, mas como não consegui configurar adicionei uma exceção
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (mergedBillingConfigurationData[section] as ISectionData).billing_account_key = billingAccountKeyToUse
                }
            }

            // Create the final merged data
            const mergedData = {
                billing_configuration_data: mergedBillingConfigurationData,
            }
            const responseQiTech = await this.client.updateBillingConfigurationByAccountKey(accountKey, mergedData)

            const finalBillingConfiguration: IBillingConfiguration = {
                document: document,
                billing_configuration_data: responseQiTech.billing_configuration_data,
            }

            if (!existingBillingConfiguration) {
                await billingRepo.insert(finalBillingConfiguration)
            } else {
                await billingRepo.updateByDocument(document, finalBillingConfiguration)
            }

            return responseQiTech
        }
    }

    public async setDefaultBillingConfiguration(document: string) {
        const accountRepository = AccountRepository.getInstance()
        const billingRepo = BillingConfigurationRepository.getInstance()

        const account = await accountRepository.getByDocument(document)
        if (!account) {
            throw new ValidationError('Não foi encontrada conta para esse documento')
        }

        const billingTemplate = await billingRepo.get('template')

        if (!billingTemplate) {
            throw new Error('Billing template não encontrado')
        }

        const accountKey = (account.data as QiTechTypes.Account.IList).account_key
        const billingAccountKeyToUse = env.BILLING_ACCOUNT_KEY === 'user' ? accountKey : env.BILLING_ACCOUNT_KEY

        //// função incompleta
        billingTemplate.billing_configuration_data.bankslip.billing_account_key = billingAccountKeyToUse
        billingTemplate.billing_configuration_data.ted.billing_account_key = billingAccountKeyToUse
        billingTemplate.billing_configuration_data.pix.billing_account_key = billingAccountKeyToUse
        billingTemplate.billing_configuration_data.account_maintenance.billing_account_key = billingAccountKeyToUse

        const configDataToSend = {
            billing_configuration_data: billingTemplate.billing_configuration_data,
        }

        const responseQiTech = await this.client.updateBillingConfigurationByAccountKey(accountKey, configDataToSend)

        const finalBillingConfiguration: IBillingConfiguration = {
            document: document,
            billing_configuration_data: billingTemplate.billing_configuration_data,
        }

        await billingRepo.upsertByDocument(document, finalBillingConfiguration)
        return responseQiTech
    }
}

interface ISectionData {
    billing_account_key: string
    // Add other fields as necessary
}
