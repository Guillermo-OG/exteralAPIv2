import { AxiosError } from 'axios'

import env from '../config/env'
import { QiTechClient, QiTechTypes } from '../infra'
import { AccountRepository } from '../repository'
import { RelatedPerson, RelatedPersonModel, ValidationError } from '../models'
import { RelatedPersonRepository } from '../repository/Person.repository'
import { IOwnerPJ } from '../infra/qitech/types/Account.types'

interface MinimalPersonResponse {
    return_response: {
        email: string
        nationality: string
        date_of_birth: string
        mother_name: string
        is_pep: boolean
        person: {
            address: { [key: string]: any }
            phone: Array<{ [key: string]: any }>
            name: string
            document_number: string
            domain: {
                owner_person_key: string
            }
        }
    }
}

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

    public async handleValidatePersonToken(payload: QiTechTypes.Person.IPersonCreateValidate): Promise<RelatedPersonModel> {
        const response = (await this.client.validateMovement(payload)) as MinimalPersonResponse

        const personData = response.return_response.person
        const relatedPerson: RelatedPersonModel = new RelatedPerson({
            address: {
                street: personData.address.street,
                number: personData.address.number,
                neighborhood: personData.address.neighborhood,
                city: personData.address.city,
                state: personData.address.state,
                postal_code: personData.address.postal_code,
                complement: personData.address.complement,
            },
            phone: {
                country_code: personData.phone[0].country_code,
                number: personData.phone[0].number,
                area_code: personData.phone[0].area_code,
            },
            email: response.return_response.email,
            name: personData.name,
            person_type: 'natural',
            nationality: response.return_response.nationality,
            birth_date: response.return_response.date_of_birth,
            mother_name: response.return_response.mother_name,
            is_pep: response.return_response.is_pep,
            individual_document_number: personData.document_number,
            owner_person_key: personData.domain.owner_person_key,
        })

        return relatedPerson.save()
    }

    public async handleCreatePersonLinkTokenRequest(payload: QiTechTypes.Person.IProfessionalCreateRequest) {
        const { pfDocument, pjDocument, ...professionalDataCreationRest } = payload.professional_data_creation

        const naturalPersonId = await this.findNaturalPersonKey(pfDocument as string)
        const legalPersonId = await this.findLegalPersonKey(pjDocument as string)

        // Cria um payload modificado com os IDs obtidos
        const modifiedPayload = {
            ...payload,
            professional_data_creation: {
                ...professionalDataCreationRest,
                natural_person: naturalPersonId,
                legal_person: legalPersonId,
            },
        }
        console.log(modifiedPayload)
        // return modifiedPayload
        // Envia o payload modificado para o cliente QiTech
        return this.client.sendTokenRequest(modifiedPayload)
    }

    public async handleValidatePersonLinkToken(payload: QiTechTypes.Person.IProfessionalCreateValidate) {
        const { pfDocument, pjDocument, ...professionalDataCreationRest } = payload.professional_data_creation

        const naturalPersonId = await this.findNaturalPersonKey(pfDocument as string)
        const legalPersonId = await this.findLegalPersonKey(pjDocument as string)

        const modifiedPayload = {
            ...payload,
            professional_data_creation: {
                ...professionalDataCreationRest,
                natural_person: naturalPersonId,
                legal_person: legalPersonId,
            },
        }

        const response = await this.client.validateMovement(modifiedPayload)

        await this.addCompanyRepresentativeLocal(pjDocument as string, pfDocument as string)
        return response
    }

    public async handleDeletePersonLinkTokenRequest(payload: QiTechTypes.Person.IProfessionalDeleteRequest) {
        const { pfDocument, pjDocument, ...professionalDataDeletionRest } = payload.professional_data_deletion

        const naturalPersonId = await this.findNaturalPersonKey(pfDocument as string)
        const legalPersonId = await this.findLegalPersonKey(pjDocument as string)

        // Prepara o payload modificado
        const modifiedPayload = {
            ...payload,
            professional_data_deletion: {
                ...professionalDataDeletionRest,
                natural_person: naturalPersonId,
                legal_person: legalPersonId,
            },
        }

        console.log(modifiedPayload)

        // Envia o payload modificado para o cliente QiTech
        return this.client.sendTokenRequest(modifiedPayload)
    }

    public async handleValidateDeletePersonLinkToken(payload: QiTechTypes.Person.IProfessionalDeleteValidate) {
        const { pfDocument, pjDocument, ...professionalDataDeletionRest } = payload.professional_data_deletion

        const naturalPersonId = await this.findNaturalPersonKey(pfDocument as string)
        const legalPersonId = await this.findLegalPersonKey(pjDocument as string)

        const modifiedPayload = {
            ...payload,
            professional_data_deletion: {
                ...professionalDataDeletionRest,
                natural_person: naturalPersonId,
                legal_person: legalPersonId,
            },
        }

        console.log(modifiedPayload)
        await this.RemoveCompanyRepresentativeLocal(pjDocument as string, pfDocument as string)
        return this.client.validateMovement(modifiedPayload)
    }

    public async handleUpdateProfessionalDataContactTokenRequest(payload: QiTechTypes.Person.IProfessionalDataContactUpdateRequest) {
        // Extrair os dados necessários do payload
        const { professional_data_contact_update } = payload
        const { pjDocument, pfDocument, email, phone_number } = professional_data_contact_update

        // Realizar verificações ou obter IDs (ajustar conforme a necessidade)
        const naturalPersonId = await this.findNaturalPersonKey(pfDocument as string)
        const legalPersonId = await this.findLegalPersonKey(pjDocument as string)

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
        const naturalPersonId = await this.findNaturalPersonKey(pfDocument as string)
        const legalPersonId = await this.findLegalPersonKey(pjDocument as string)

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

        console.log('Modified Payload:', modifiedPayload)
        // Enviar o payload modificado para validação através do cliente QiTech
        // return this.client.validateMovement(modifiedPayload)
    }

    // public async handleUpdatePersonDataContactTokenRequest(payload: QiTechTypes.Person.IPersonDataContactUpdateRequest) {
    //     // Extrair os dados necessários do payload
    //     const { person_contact_update } = payload
    //     const { pfDocument, email, phone_number } = person_contact_update

    //     // Realizar verificações ou obter IDs (ajustar conforme a necessidade)
    //     const person_key = await this.findKeyByDocument(pfDocument)

    //     // Construir um payload modificado
    //     const modifiedPayload = {
    //         ...payload,
    //         person_contact_update: {
    //             ...person_contact_update,
    //             person_key: person_key,
    //             contact_info: {
    //                 email,
    //                 phone_number,
    //             },
    //         },
    //     }

    //     // Enviar o payload modificado para o cliente QiTech
    //     return this.client.sendTokenRequest(modifiedPayload)
    // }

    // public async handleValidatePersonUpdateDataContactToken(payload: QiTechTypes.Person.IPersonDataContactUpdateValidate) {
    //     // Extrair os dados necessários do payload
    //     const { person_contact_update } = payload
    //     const { pfDocument, email, phone_number } = person_contact_update

    //     // Realizar verificações ou obter IDs (ajustar conforme a necessidade)
    //     const person_key = await this.findKeyByDocument(pfDocument)
    //     //TODOOOO person_key
    //     // Construir um payload modificado
    //     const modifiedPayload = {
    //         ...payload,
    //         person_contact_update: {
    //             ...person_contact_update,
    //             person_key: person_key,
    //             contact_info: {
    //                 email,
    //                 phone_number,
    //             },
    //         },
    //     }

    //     // Enviar o payload modificado para validação através do cliente QiTech
    //     return this.client.validateMovement(modifiedPayload)
    // }

    private async findNaturalPersonKey(document: string): Promise<string> {
        if (!document) {
            throw new Error('Falta o documento.')
        }
        let entityKey: string = ''
        const accountRepository = AccountRepository.getInstance()
        const account = await accountRepository.getByDocument(document)

        if (account && account.response) {
            entityKey = (account.data as QiTechTypes.Account.IList).owner_person_key
        } else {
            const personRepository = RelatedPersonRepository.getInstance()
            const person = await personRepository.getByDocument(document) // Asumiendo que existe este método

            if (person && person.individual_document_number) {
                entityKey = person.owner_person_key ? person.owner_person_key : ''
            } else {
                const result = (await this.client.listAccounts(document)) as QiTechTypes.Common.IPaginatedSearch<QiTechTypes.Account.IList>
                if (result.data[0] && result.data[0].owner_person_key) {
                    entityKey = result.data[0].owner_person_key || ''
                } else {
                    throw new Error('Documento da PF não encontrado.')
                }
            }
        }

        if (!entityKey) {
            throw new Error('Documento da PF não encontrado.')
        }
        return entityKey
    }

    private async findLegalPersonKey(document: string): Promise<string> {
        if (!document) {
            throw new Error('Falta o documento.')
        }

        const relatedPersons: QiTechTypes.Person.IRelatedPersonsResponse = await this.getRelatedPersonsByDocument(document)

        if (!relatedPersons) {
            throw new Error('O cnpj para vincular não foi encontrado.')
        }

        // Assumindo que queremos o primeiro legal_person_key achado nas pessoas relacionadas
        const legalPersonKey = relatedPersons.legal_person_key
        if (!legalPersonKey) {
            throw new Error('Key de pessoa legal não encontrada.')
        }

        return legalPersonKey
    }

    public async getRelatedPersonsByDocument(document: string) {
        const accountRepository = AccountRepository.getInstance()
        const account = await accountRepository.getByDocument(document)
        if (!account) {
            throw new ValidationError('Conta não encontrada para este documento')
        }

        const accountKey = (account.data as QiTechTypes.Account.IList).account_key

        const relatedPersons = await this.client.getRelatedPersons(accountKey)
        return relatedPersons
    }

    public async addCompanyRepresentativeLocal(pjDocument: string, pfDocument: string) {
        // Buscar a conta usando o CNPJ
        const accountRepository = AccountRepository.getInstance()
        const account = await accountRepository.getByDocument(pjDocument)
        if (!account) {
            throw new Error('Conta não encontrada para o documento fornecido')
        }

        const relatedPerson = await RelatedPerson.findOne({ individual_document_number: pfDocument })
        if (!relatedPerson) {
            throw new Error('Pessoa relacionada não encontrada para o documento fornecido')
        }

        // Converter o documento relatedPerson para o formato esperado em company_representatives
        const novoRepresentante = {
            address: relatedPerson.address,
            phone: relatedPerson.phone,
            email: relatedPerson.email,
            name: relatedPerson.name,
            person_type: relatedPerson.person_type,
            nationality: relatedPerson.nationality,
            birth_date: relatedPerson.birth_date,
            mother_name: relatedPerson.mother_name,
            is_pep: relatedPerson.is_pep,
            individual_document_number: relatedPerson.individual_document_number,
            document_identification: relatedPerson.document_identification,
            document_identification_type: relatedPerson.document_identification_type,
        }

        const account_owner = (account.request as QiTechTypes.Account.ICreate).account_owner as IOwnerPJ

        // Adicionar o novo representante ao array de company_representatives
        if (account_owner?.company_representatives) {
            account_owner.company_representatives = []
        }
        account_owner.company_representatives.push(novoRepresentante)

        // Salvar as alterações na conta
        await account.save()
    }

    public async RemoveCompanyRepresentativeLocal(pjDocument: string, pfDocument: string) {
        const accountRepository = AccountRepository.getInstance()
        const account = await accountRepository.getByDocument(pjDocument)

        if (!account) {
            throw new Error('Conta não encontrada para o documento fornecido.')
        }

        const accountOwner = (account.request as QiTechTypes.Account.ICreate).account_owner as IOwnerPJ
        const accountData = account.data as QiTechTypes.Account.IList

        if (!accountOwner || !accountOwner.company_representatives) {
            console.log('Erro atualizando os dados locais de account.')
        }

        let accountResponse = account.response as QiTechTypes.Account.ICreateResponse

        const mainRepresentativeInfo = accountResponse.data.account_owner
        let isMainRepresentativeRemoved = false

        // Verifica se o representante a ser removido é o principal
        if (
            mainRepresentativeInfo &&
            mainRepresentativeInfo.document_number !== pjDocument &&
            mainRepresentativeInfo.name === accountOwner.name
        ) {
            isMainRepresentativeRemoved = accountOwner.company_representatives.some(
                representative => representative.individual_document_number === pfDocument
            )
        }

        // Filtra os representantes, removendo o especificado
        const newRepresentatives = accountOwner.company_representatives.filter(
            representative => representative.individual_document_number !== pfDocument
        )

        // Se o principal foi removido, atualiza para o novo principal
        if (isMainRepresentativeRemoved && newRepresentatives.length > 0) {
            // Define o novo principal com o primeiro da lista atualizada
            const newMainRepresentative = newRepresentatives[0]
            accountOwner.name = newMainRepresentative.name
            accountOwner.email = newMainRepresentative.email
            accountOwner.phone = newMainRepresentative.phone
            accountResponse.data.account_owner.name = newMainRepresentative.name

            accountData.owner_name = newMainRepresentative.name
            // Garanta que não estamos alterando o document_number se for o documento da empresa
            if (newMainRepresentative.individual_document_number !== pjDocument) {
                accountResponse.data.account_owner.document_number = newMainRepresentative.individual_document_number
                accountData.owner_document_number = newMainRepresentative.individual_document_number

                const newOwnerPersonKey = await this.findNaturalPersonKey(newMainRepresentative.individual_document_number)
                accountData.owner_person_key = newOwnerPersonKey
            }
        }

        // Atualiza a lista de representantes
        accountOwner.company_representatives = newRepresentatives

        // Salva as alterações na conta
        await account.save()
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
