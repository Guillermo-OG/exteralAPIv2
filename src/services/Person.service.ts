import { AxiosError } from 'axios'
import env from '../config/env'
import { QiTechClient, QiTechTypes } from '../infra'

export class PersonService {
    private static instance: PersonService
    private readonly client: QiTechClient

    constructor() {
        this.client = new QiTechClient({
            apiKey: env.QITECH_API_KEY,
            baseUrl: env.QITECH_BASE_URL,
            privateKey: env.QITECH_PRIVATE_KEY,
            passphrase: env.QITECH_PRIVATE_KEY_PASSPHRASE,
            qiPublicKey: env.QITECH_PUBLIC_KEY,
            billingAccountKey: env.BILLING_ACCOUNT_KEY,
        })
    }

    public static getInstance(): PersonService {
        if (!PersonService.instance) {
            PersonService.instance = new PersonService()
        }
        return PersonService.instance
    }

    public async handleCreatePersonTokenRequest(payload: QiTechTypes.Person.IPersonCreateRequest) {
        return this.client.sendTokenRequest(payload)
    }

    public async handleValidatePersonToken(payload: QiTechTypes.Person.IPersonCreateValidate) {
        return this.client.validateMovement(payload)
    }

    public async handleCreatePersonLinkTokenRequest(payload: QiTechTypes.Person.IProfessionalCreateRequest) {
        return this.client.sendTokenRequest(payload)
    }

    public async handleValidatePersonLinkToken(payload: QiTechTypes.Person.IProfessionalCreateValidate) {
        return this.client.validateMovement(payload)
    }

    public async handleDeletePersonLinkTokenRequest(payload: QiTechTypes.Person.IProfessionalDeleteRequest) {
        return this.client.sendTokenRequest(payload)
    }

    public async handleValidateDeletePersonLinkToken(payload: QiTechTypes.Person.IProfessionalDeleteValidate) {
        return this.client.validateMovement(payload)
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
}
