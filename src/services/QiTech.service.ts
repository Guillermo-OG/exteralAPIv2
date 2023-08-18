import { AxiosError } from 'axios'
import { Request } from 'express'
import { HydratedDocument } from 'mongoose'
import env from '../config/env'
import { OnboardingTypes, QiTechClient, QiTechTypes } from '../infra'
import {
    AccountStatus,
    AccountType,
    IAccount,
    IApiUser,
    NotFoundError,
    PixKeyType,
    PixStatus,
    UnauthorizedError,
    ValidationError,
} from '../models'
import { AccountRepository, ApiUserRepository, FileRepository, PixKeyRepository } from '../repository'
import { maskCNAE, unMask } from '../utils/masks'
import { NotificationService } from './Notification.service'
import { OnboardingService } from './Onboarding.service'

export class QiTechService {
    private static instance: QiTechService
    private readonly client: QiTechClient
    private readonly fileRepository: FileRepository

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
            account.status = AccountStatus.FAILED
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

    public async updateAccountWithQi(account: HydratedDocument<IAccount>): Promise<HydratedDocument<IAccount>> {
        const updatedAccount = (await this.client.listAccounts(account.document)).data.find(
            acc => acc.account_number === account.response?.data.account_info.account_number
        )

        if (updatedAccount) {
            account.data = updatedAccount
            account.markModified('data')
        }

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
            throw new UnauthorizedError()
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
            default:
                return AccountStatus.FAILED
        }
    }

    public async listAllAccounts(page: number, pageSize: number): Promise<QiTechTypes.Common.IPaginatedSearch<QiTechTypes.Account.IList>> {
        return await this.client.listAllAccounts(page, pageSize)
    }
}
