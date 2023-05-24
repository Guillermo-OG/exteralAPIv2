import { AxiosError } from 'axios'
import { Request } from 'express'
import { HydratedDocument } from 'mongoose'
import env from '../config/env'
import { QiTechClient, QiTechTypes } from '../infra'
import { AccountStatus, AccountType, IAccount, NotFoundError, UnauthorizedError, ValidationError } from '../models'
import { AccountRepository, FileRepository } from '../repository'
import { unMask } from '../utils/masks'

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

    public async createAccount(document: string, payload: QiTechTypes.Account.ICreate) {
        const accountRepository = AccountRepository.getInstance()
        const accountType = unMask(document).length === 11 ? AccountType.PF : AccountType.PJ

        let account = await accountRepository.getByDocument(document)
        if (account && account.status !== AccountStatus.FAILED) {
            throw new ValidationError('Existing account found for this document')
        }

        const accountResponse = await this.client.createAccount(payload)
        if (account) {
            account.request = payload
            account.response = accountResponse
            account.status = AccountStatus.PENDING
            account.markModified('request')
            account.markModified('data')
            await account.save()
        } else {
            account = await accountRepository.create({
                document: document,
                request: payload,
                response: accountResponse,
                status: AccountStatus.PENDING,
                type: accountType,
            })
        }

        return account
    }

    public async updateAccountWithQi(account: HydratedDocument<IAccount>): Promise<HydratedDocument<IAccount>> {
        const updatedAccount = (await this.client.listAccounts(account.document)).data[0]

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

        const decodedBody = await this.client.decodeMessage<QiTechTypes.Account.IAccountWebhook>('/webhook/account', 'POST', headers, body)
        switch (decodedBody.webhook_type) {
            case 'account':
                await this.handleAccountWebhook(decodedBody)
                break

            default:
                break
        }
    }

    private async handleAccountWebhook(decodedBody: QiTechTypes.Account.IAccountWebhook) {
        const account = await AccountRepository.getInstance().getByExternalKey(decodedBody.key)
        if (!account) {
            throw new NotFoundError('Account not found for this key')
        } else if (account.status === AccountStatus.SUCCESS) {
            return account
        }

        const updatedStatus = this.mapStatus(decodedBody.status)
        account.status = updatedStatus

        if (updatedStatus === AccountStatus.SUCCESS) {
            await this.updateAccountWithQi(account)
        }
        await account.save()

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
            const method = error.config?.method
            if (!headers || !data || !url ||!method) {
                return error
            }
    
            const decoded = await this.client.decodeMessage(url, method.toUpperCase(), headers, data)
            error.response.data = decoded
            return error
        } catch (err) {
            return error
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
}
