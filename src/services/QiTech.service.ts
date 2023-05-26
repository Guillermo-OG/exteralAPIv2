import { AxiosError } from 'axios'
import { Request } from 'express'
import { HydratedDocument } from 'mongoose'
import env from '../config/env'
import { QiTechClient, QiTechTypes } from '../infra'
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
import { unMask } from '../utils/masks'
import { NotificationService } from './Notification.service'
import { IAllowedUser, ICreate, IOwnerPF, IOwnerPJ, PfPayload, PjPayload } from '../infra/qitech/types/Account.types'
import { areaCodeAndNumberFromPhone } from '../utils/stringUtils'
import { format } from 'date-fns'

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
        const accountType = unMask(document).length === 11 ? AccountType.PF : AccountType.PJ
        const callbackURL = payload.callbackURL || ''
        delete payload.callbackURL

        let account = await accountRepository.getByDocument(document)
        if (account && account.status !== AccountStatus.FAILED) {
            throw new ValidationError('Existing account found for this document')
        }

        const accountResponse = await this.client.createAccount(payload)
        if (account) {
            account.callbackURL = callbackURL
            account.request = payload
            account.response = accountResponse
            account.status = AccountStatus.PENDING
            account.markModified('request')
            account.markModified('data')
            await account.save()
        } else {
            account = await accountRepository.create({
                callbackURL,
                document: document,
                request: payload,
                response: accountResponse,
                status: AccountStatus.PENDING,
                type: accountType,
                apiUserId: apiUser.id,
            })
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

    public mapPayloadToCreateAccount(payload: PfPayload | PjPayload): { account: ICreate; document: string } {
        let callbackURL = ''
        let owner: IOwnerPF | IOwnerPJ | null = null
        let allowedUser: IAllowedUser | null = null
        let document = ''

        if ('conta' in payload) {
            const company_representatives: IOwnerPF[] = []
            for (const representative of payload.usuario.conta.socios) {
                const user = representative.contaSocio.usuarios[0]
                document = unMask(payload.conta.cpfCnpj)
                company_representatives.push({
                    address: {
                        city: representative.contaSocio.endereco.cidade,
                        neighborhood: representative.contaSocio.endereco.bairro,
                        number: representative.contaSocio.endereco.numero,
                        postal_code: unMask(representative.contaSocio.endereco.cep),
                        state: representative.contaSocio.endereco.estado,
                        street: representative.contaSocio.endereco.rua,
                    },
                    birth_date: format(new Date(user.dataNascimento), 'yyyy-MM-dd'),
                    email: user.email,
                    individual_document_number: unMask(user.cpf),
                    is_pep: user.pep,
                    mother_name: payload.usuario.conta.subConta.nomeMae,
                    name: user.nome,
                    nationality: payload.usuario.conta.subConta.nacionalidade,
                    person_type: 'natural',
                })
            }

            const phone = areaCodeAndNumberFromPhone(payload.usuario.celular)
            const pj: IOwnerPJ = {
                address: {
                    city: payload.conta.endereco.cidade,
                    neighborhood: payload.conta.endereco.bairro,
                    number: payload.conta.endereco.numero,
                    postal_code: unMask(payload.conta.endereco.cep),
                    state: payload.conta.endereco.estado,
                    street: payload.conta.endereco.rua,
                },
                cnae_code: payload.usuario.conta.subConta.cnae,
                phone: phone ? { area_code: phone.areaCode, country_code: '55', number: phone.number } : undefined,
                person_type: 'legal',
                name: payload.usuario.nome,
                email: payload.usuario.email,
                foundation_date: format(new Date(payload.conta.dataAbertura), 'yyyy-MM-dd'),
                trading_name: payload.usuario.conta.subConta.nomeFantasia,
                // company_type: CompanyType.cop, //talvez não precisa
                // company_statute: 'sad',
                company_representatives: company_representatives,
            }
            owner = pj
            callbackURL = payload.callbackURL
            allowedUser = {
                email: payload.usuario.email,
                individual_document_number: unMask(payload.usuario.cpf),
                name: payload.usuario.nome,
                person_type: 'natural',
                phone: phone ? { area_code: phone.areaCode, country_code: phone.countryCode, number: phone.number } : undefined,
            }
        } else {
            const user = payload.usuarios[0]
            const phone = areaCodeAndNumberFromPhone(payload.celular)
            const pf: IOwnerPF = {
                address: {
                    city: payload.endereco.cidade,
                    neighborhood: payload.endereco.bairro,
                    number: payload.endereco.numero,
                    postal_code: unMask(payload.endereco.cep),
                    state: payload.endereco.estado,
                    street: payload.endereco.rua,
                },
                birth_date: format(new Date(user.dataNascimento), 'yyyy-MM-dd'),
                email: user.email,
                is_pep: user.pep,
                name: user.nome,
                mother_name: user.conta.subConta.nomeMae,
                nationality: user.conta.subConta.nacionalidade,
                phone: phone ? { area_code: phone.areaCode, country_code: phone.countryCode, number: phone.number } : undefined,
                individual_document_number: unMask(payload.cpfCnpj),
                person_type: 'natural',
            }
            allowedUser = {
                email: user.email,
                individual_document_number: unMask(payload.cpfCnpj),
                name: user.nome,
                person_type: 'natural',
                phone: phone ? { area_code: phone.areaCode, country_code: phone.countryCode, number: phone.number } : undefined,
            }
            owner = pf
            callbackURL = payload.callbackURL
            document = unMask(payload.cpfCnpj)
        }

        return {
            account: {
                callbackURL: callbackURL,
                account_owner: owner,
                allowed_user: allowedUser,
            },
            document,
        }
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
            const method = error.config?.method
            if (!headers || !data || !url || !method) {
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
