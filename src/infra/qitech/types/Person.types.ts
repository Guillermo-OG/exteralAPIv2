export interface IPersonCreateRequest {
    contact_type: string
    person_creation: IPersonData
    agent_document_number: string
}

export interface IPersonCreateValidate {
    person_creation: IPersonData
    token: string
}

export interface IPersonData {
    person: IPerson
}

export interface IPerson {
    date_of_birth: string
    spouse_name?: string
    birth_place: string
    phone_number: IPhoneNumber
    representative?: undefined
    father_name: string
    address: IAddress
    nationality: string
    document_identification_number: string
    mother_name: string
    person_type: 'natural'
    name: string
    profession: string
    gender?: undefined
    email: string
    document_number: string
    marital_status?: undefined
}

export interface IPhoneNumber {
    country_code: string
    area_code: string
    number: string
}

export interface IAddress {
    street: string
    complement: string
    state: string
    number: string
    neighborhood: string
    postal_code: string
    city: string
}

export interface IProfessionalDataCreation {
    natural_person?: string
    legal_person?: string
    pfDocument?: string
    pjDocument?: string
    natural_person_roles: INaturalPersonRole[]
    post_type: string
}

export interface INaturalPersonRole {
    product_type: string
    role_type: string
}

export interface IProfessionalCreateRequest {
    contact_type: string
    professional_data_creation: IProfessionalDataCreation
    agent_document_number: string
}

export interface IProfessionalCreateValidate {
    token: string
    professional_data_creation: IProfessionalDataCreation
}

export interface IProfessionalDataDeletion {
    natural_person?: string
    legal_person?: string
    pfDocument?: string
    pjDocument?: string
}

export interface IProfessionalDeleteRequest {
    contact_type: string
    professional_data_deletion: IProfessionalDataDeletion
    agent_document_number: string
}

export interface IProfessionalDeleteValidate {
    token: string
    professional_data_deletion: IProfessionalDataDeletion
}
