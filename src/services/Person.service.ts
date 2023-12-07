import { AxiosError } from 'axios'

import env from '../config/env'
import { QiTechClient, QiTechTypes } from '../infra'
import { OnboardingRepository } from '../repository'

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
        const { pfDocument, pjDocument, ...professionalDataCreationRest } = payload.professional_data_creation

        const naturalPersonId = await this.findIdByDocument(pfDocument)
        const legalPersonId = await this.findIdByDocument(pjDocument)

        // Cria um payload modificado com os IDs obtidos
        const modifiedPayload = {
            ...payload,
            professional_data_creation: {
                ...professionalDataCreationRest,
                natural_person: naturalPersonId,
                legal_person: legalPersonId,
            },
        }

        // Envia o payload modificado para o cliente QiTech
        return this.client.sendTokenRequest(modifiedPayload)
    }

    public async handleValidatePersonLinkToken(payload: QiTechTypes.Person.IProfessionalCreateValidate) {
        const { pfDocument, pjDocument, ...professionalDataCreationRest } = payload.professional_data_creation

        const naturalPersonId = await this.findIdByDocument(pfDocument)
        const legalPersonId = await this.findIdByDocument(pjDocument)

        const modifiedPayload = {
            ...payload,
            professional_data_creation: {
                ...professionalDataCreationRest,
                natural_person: naturalPersonId,
                legal_person: legalPersonId,
            },
        }

        return this.client.validateMovement(modifiedPayload)
    }

    public async handleDeletePersonLinkTokenRequest(payload: QiTechTypes.Person.IProfessionalDeleteRequest) {
        const { pfDocument, pjDocument, ...professionalDataDeletionRest } = payload.professional_data_deletion

        const naturalPersonId = await this.findIdByDocument(pfDocument)
        const legalPersonId = await this.findIdByDocument(pjDocument)

        // Prepara o payload modificado
        const modifiedPayload = {
            ...payload,
            professional_data_deletion: {
                ...professionalDataDeletionRest,
                natural_person: naturalPersonId,
                legal_person: legalPersonId,
            },
        }

        // Envia o payload modificado para o cliente QiTech
        return this.client.sendTokenRequest(modifiedPayload)
    }

    public async handleValidateDeletePersonLinkToken(payload: QiTechTypes.Person.IProfessionalDeleteValidate) {
        const { pfDocument, pjDocument, ...professionalDataDeletionRest } = payload.professional_data_deletion

        const naturalPersonId = await this.findIdByDocument(pfDocument)
        const legalPersonId = await this.findIdByDocument(pjDocument)

        const modifiedPayload = {
            ...payload,
            professional_data_deletion: {
                ...professionalDataDeletionRest,
                natural_person: naturalPersonId,
                legal_person: legalPersonId,
            },
        }

        return this.client.validateMovement(modifiedPayload)
    }

    private async findIdByDocument(document: string | undefined): Promise<string> {
        const repository = OnboardingRepository.getInstance()

        if (!document) {
            throw new Error('Erro no documento.')
        }

        const onboarding = await repository.getByDocument(document)
        if (!onboarding || !onboarding.response?.id) {
            throw new Error('Onboarding do Documento não encontrado.')
        }

        return onboarding.response.id
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
