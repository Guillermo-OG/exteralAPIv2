import { AxiosError } from 'axios'

import env from '../config/env'
import { QiTechClient, QiTechTypes } from '../infra'
import { AccountRepository } from '../repository'

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

    public async handleUpdateProfessionalDataContactTokenRequest(payload: QiTechTypes.Person.IProfessionalDataContactUpdateRequest) {
        // Extrair os dados necessários do payload
        const { professional_data_contact_update } = payload
        const { pjDocument, pfDocument, email, phone_number } = professional_data_contact_update

        // Realizar verificações ou obter IDs (ajustar conforme a necessidade)
        const naturalPersonId = await this.findIdByDocument(pfDocument)
        const legalPersonId = await this.findIdByDocument(pjDocument)

        // Construir um payload modificado
        const modifiedPayload = {
            ...payload,
            professional_data_contact_update: {
                ...professional_data_contact_update,
                natural_person: naturalPersonId,
                legal_person: legalPersonId,
                contact_info: {
                    email,
                    phone_number,
                },
            },
        }

        // Enviar o payload modificado para o cliente QiTech
        return this.client.sendTokenRequest(modifiedPayload)
    }

    public async handleValidateProfessionalUpdateDataContactToken(payload: QiTechTypes.Person.IProfessionalDataContactUpdateValidate) {
        // Extrair os dados necessários do payload
        const { professional_data_contact_update } = payload
        const { pjDocument, pfDocument, email, phone_number } = professional_data_contact_update

        // Realizar verificações ou obter IDs (ajustar conforme a necessidade)
        const naturalPersonId = await this.findIdByDocument(pfDocument)
        const legalPersonId = await this.findIdByDocument(pjDocument)

        // Construir um payload modificado
        const modifiedPayload = {
            ...payload,
            professional_data_contact_update: {
                ...professional_data_contact_update,
                natural_person: naturalPersonId,
                legal_person: legalPersonId,
                contact_info: {
                    email,
                    phone_number,
                },
            },
        }

        // Enviar o payload modificado para validação através do cliente QiTech
        return this.client.validateMovement(modifiedPayload)
    }

    public async handleUpdatePersonDataContactTokenRequest(payload: QiTechTypes.Person.IPersonDataContactUpdateRequest) {
        // Extrair os dados necessários do payload
        const { person_contact_update } = payload
        const { pfDocument, email, phone_number } = person_contact_update

        // Realizar verificações ou obter IDs (ajustar conforme a necessidade)
        const person_key = await this.findKeyByDocument(pfDocument)

        // Construir um payload modificado
        const modifiedPayload = {
            ...payload,
            person_contact_update: {
                ...person_contact_update,
                person_key: person_key,
                contact_info: {
                    email,
                    phone_number,
                },
            },
        }

        // Enviar o payload modificado para o cliente QiTech
        return this.client.sendTokenRequest(modifiedPayload)
    }

    public async handleValidatePersonUpdateDataContactToken(payload: QiTechTypes.Person.IPersonDataContactUpdateValidate) {
        // Extrair os dados necessários do payload
        const { person_contact_update } = payload
        const { pfDocument, email, phone_number } = person_contact_update

        // Realizar verificações ou obter IDs (ajustar conforme a necessidade)
        const person_key = await this.findKeyByDocument(pfDocument)
        //TODOOOO person_key
        // Construir um payload modificado
        const modifiedPayload = {
            ...payload,
            person_contact_update: {
                ...person_contact_update,
                person_key: person_key,
                contact_info: {
                    email,
                    phone_number,
                },
            },
        }

        // Enviar o payload modificado para validação através do cliente QiTech
        return this.client.validateMovement(modifiedPayload)
    }

    private async findIdByDocument(document: string | undefined): Promise<string> {
        const repository = AccountRepository.getInstance()
        // const onboardingSrvice = OnboardingService.getInstance()
        let entityKey = ''
        if (!document) {
            throw new Error('Falta o documento.')
        }

        const account = await repository.getByDocument(document)
        if (!account || !account.response) {
            throw new Error('Account do Documento não encontrado.')
        }

        entityKey = (account.data as QiTechTypes.Account.IList).owner_person_key

        return entityKey
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
