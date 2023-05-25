import { AxiosError } from 'axios'
import { Request } from 'express'
import { HydratedDocument } from 'mongoose'
import env from '../config/env'
import { QiTechClient, QiTechTypes } from '../infra'
import { AccountStatus, AccountType, IAccount, NotFoundError, UnauthorizedError, ValidationError, PixKeyType, PixStatus } from '../models'
import { AccountRepository, FileRepository, PixKeyRepository } from '../repository'
import { unMask } from '../utils/masks'
import { PixRepository } from '../repository/Pix.repository'
import { PixStatus } from '../models/Pix.model'
import { ICreatePix, IPixKeyStatus, IWebhookPix } from '../infra/qitech/types/Pix.types'

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

    public async createPixKey(payload: QiTechTypes.Pix.ICreatePix) {
        const pixRepository = PixKeyRepository.getInstance()
        const accountRepository = AccountRepository.getInstance()

        const account = await accountRepository.getByAccountKey(payload.account_key)
        if (!account) {
            throw new ValidationError('No account found for this document')
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
            })
        }

        return pix
    }

    public async handlePixWebhook(payload: QiTechTypes.Pix.IWebhookPix) {
        const pixRepository = PixKeyRepository.getInstance()

        const pix = await pixRepository.getByRequestKey(payload.pix_key_request_key)
        if (!pix) {
            throw new NotFoundError('Pix not found for this key')
        }

        if (payload.pix_key_request_status !== QiTechTypes.Pix.IPixKeyStatus.SUCCESS) {
            pix.status = PixStatus.FAILED
        } else {
            pix.status = PixStatus.SUCCESS
            pix.key = payload.pix_key
        }
        pix.data = payload
        await pix.save()
        return pix
    }

    public async getAndUpdateAccount(document: string): Promise<AccountModel> {
        const account = await AccountRepository.getInstance().getByDocument(document)
        if (!account) {
            throw new NotFoundError('Account not found for this document')
        }

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

            default:
                break
        }
    }

    private async handleAccountWebhook(decodedBody: QiTechTypes.Account.IAccountWebhook) {
        let account = await AccountRepository.getInstance().getByExternalKey(decodedBody.key)
        if (!account) {
            throw new NotFoundError('Account not found for this key')
        } else if (account.status === AccountStatus.SUCCESS) {
            return account
        }

        const updatedStatus = this.mapStatus(decodedBody.status)
        account.status = updatedStatus

        if (updatedStatus === AccountStatus.SUCCESS) {
            account = await this.updateAccountWithQi(account)
            if (account.data) {
                await this.createPixKey({
                    account_key: (account.data as QiTechTypes.Account.IList).account_key as string,
                    pix_key_type: PixKeyType.RANDOM_KEY
                })
            }
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
