import { Request } from 'express'
import env from '../config/env'
import { QiTechClient, QiTechTypes } from '../infra'
import { AccountModel, AccountStatus, AccountType, NotFoundError, ValidationError } from '../models'
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

    public async createAccount(document: string, payload: unknown) {
        const accountRepository = AccountRepository.getInstance()
        console.log('a')
        const accountType = unMask(document).length === 11 ? AccountType.PF : AccountType.PJ
        console.log('b')

        let account = await accountRepository.getByDocument(document)
        if (account && account.status !== AccountStatus.FAILED) {
            throw new ValidationError('Existing account found for this document')
        }

        const accountResponse = await this.client.createAccount(payload)
        console.log(accountResponse)
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

    public async getAndUpdateAccount(document: string): Promise<AccountModel> {
        const account = await AccountRepository.getInstance().getByDocument(document)
        if (!account) {
            throw new NotFoundError('Account not found for this document')
        }

        const res = await this.client.getAccount(document)
        console.log(res)

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

    public async handleWebhook(req: Request) {
        const { headers, body } = req
        if (!body.encoded_body) {
            throw new ValidationError('Invalid Body')
        }

        const decodedBody = await this.client.decodeMessage<QiTechTypes.Account.IAccountWebhook>('/webhook/account', 'POST', headers, body)
        const account = await AccountRepository.getInstance().getByExternalKey(decodedBody.key)
        if (!account) {
            throw new NotFoundError('Account not found for this key')
        }

        account.status = this.mapStatus(decodedBody.status)
        await account.save()

        return account
    }

    public async decode(headers: any, body: any) {
        return this.client.decodeMessage('/webhook/account', 'POST', headers, body)
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
