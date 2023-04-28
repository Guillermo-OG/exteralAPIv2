export enum EmailValidationType {
    ZAIG_API = 'zaig_api',
    COMPANY_EMAIL = 'company_email',
}

export enum PhoneType {
    RESIDENTIAL = 'residential',
    COMMERCIAL = 'commercial',
    MOBILE = 'mobile',
}

export enum PhoneValidationType {
    ZAIG_SMS = 'zaig_sms',
    ZAIG_CALL = 'zaig_call',
    COMPANY_SMS = 'company_sms',
    COMPANY_CALL = 'company_call',
}

export enum AddressValidationType {
    VISIT = 'visit',
    ZAIG_OCR = 'zaig_ocr',
}

export enum DocumentValidationType {
    ZAIG_API = 'zaig_api',
    ZAIG_SDK = 'zaig_sdk',
}

interface IEmail {
    email: string
    validation_key: string
    validation_type: EmailValidationType
}

interface IPhone {
    international_dial_code: string // only numbers
    area_code: string //only numbers
    number: string //only numbers
    type: PhoneType
    validation_type: PhoneValidationType
    validation_key: string //GUID
}

interface ISource {
    ip: string //masked
    channel: string
    plataform: string
    session_id: string
}

interface IAddress {
    street: string
    number: string
    neighborhood: string
    city: string
    uf: string
    complement: string
    postal_code: string // with hifen
    country: string // ISO 3166-1 alfa-3
    validation_type: AddressValidationType
    ocr_key: string //GUID
}

interface INaturalDocuments {
    rg: {
        number: string // masked
        issuer: string
        issuer_state: string // \w{2}
        issuance_date: string // yyyy-MM-dd
        validation_type: DocumentValidationType
        ocr_key: string //GUID
    }
    cnh: {
        register_number: string
        issuer_state: string // \w{2}
        first_issuance_date: string // yyyy-MM-dd
        issuance_date: string // yyyy-MM-dd
        expiration_date: string // yyyy-MM-dd
        category: string // enum CATEGORIA CNH upper case
        validation_type: DocumentValidationType
        ocr_key: string //GUID
    }
}

interface ILegalDocuments {
    ie: {
        number: string // masked
        issuer: string
        issuer_state: string // \w{2}
        issuance_date: string // yyyy-MM-dd
        validation_type: 'zaig_api'
        ocr_key: string //GUID
    }
    company_statute: {
        ocr_key: string //GUID
    }
}

interface IFace {
    validation_type: DocumentValidationType
    registration_key: string // GUID
    validation_key: string // GUID
}

export interface INaturalPersonCreate {
    id: string
    registration_id: string
    name: string
    registration_date: string // yyyy-MM-dd
    client_category: string
    document_number: string // masked
    birthdate: string // yyyy-MM-dd
    gender: Gender
    nationality: string // ISO 3166-1 alfa-3
    mother_name: string
    father_name: string
    monthly_income: number // cents
    declared_assets: number // cents
    occupation: string
    emails: IEmail[]
    phones: IPhone[]
    source: ISource
    address: IAddress
    documents: INaturalDocuments
    face: IFace
}

export interface INaturalPersonCreateResponse {
    id: string
    analysis_status: AnalysisStatus
    natural_person_key: string
    reason: string
}

export interface IPartner {
    name: string
    document_number: string // Masked
    birthdate: string // date
    gender: Gender
    nationality: string // ISO 3166-1 alfa-3
    mother_name: string
    occupation: string
    emails: IEmail[]
    documents: INaturalDocuments
    address: IAddress
    phones: IPhone[]
    source: ISource
    face: IFace
}

export enum ClientStatus {
    REGISTERED = 'registered',
    APPROVED = 'approved',
    REPROVED = 'reproved',
    FRAUD_BLOCKED = 'fraud_blocked',
    DEFAULT_BLOCKED = 'default_blocked',
    CANCELED = 'canceled',
}

export enum AnalysisStatus {
    AUTOMATICALLY_APPROVED = 'automatically_approved',
    AUTOMATICALLY_REPROVED = 'automatically_reproved',
    IN_MANUAL_ANALYSIS = 'in_manual_analysis',
    MANUALLY_APPROVED = 'manually_approved',
    MANUALLY_REPROVED = 'manually_reproved',
    IN_QUEUE = 'in_queue',
    PENDING = 'pending',
    NOT_ANALYSED = 'not_analysed',
}

export enum Gender {
    MALE = 'male',
    FEMALE = 'female',
}

export interface INaturalPersonGetResponse extends INaturalPersonCreate {
    company_key: string
    company_name: string
    client_status: ClientStatus
    analysis_status: AnalysisStatus
    created_at: string
    client_status_events: {
        new_status: ClientStatus
        event_date: string
        observation: null | string
        analyst_name: null | string
        analyst_email: null | string
        analyst_key: null | string
    }[]
    analysis_status_events: {
        new_status: AnalysisStatus
        event_date: string
        observation: null | string
        analyst_name: null | string
        analyst_email: null | string
        analyst_key: null | string
    }[]
}

export interface ILegalPersonCreate {
    id: string
    registration_id: string
    registration_date: string // datetime
    client_category: string
    legal_name: string
    trading_name: string
    document_number: string // masked
    foundation_date: string // date
    website: string
    activity: string
    activity_code: string // CNAE
    merchant_category_code: string // MCC
    tier: string
    annual_revenues: number //cents
    emails: IEmail[]
    documents: ILegalDocuments
    address: IAddress
    phones: IPhone[]
    source: ISource
    partners: IPartner[]
    legal_representatives: {
        name: string
        document_number: string // Masked
        birthdate: string // date
        gender: Gender
        nationality: string // ISO 3166-1 alfa-3
        mother_name: string
        occupation: string
        emails: IEmail[]
        documents: INaturalDocuments
        address: IAddress
        phones: IPhone[]
        source: ISource
        face: IFace
    }[]
}

export interface ILegalPersonCreateResponse {
    id: string
    legal_person_key: string
    analysis_status: AnalysisStatus
    reson: string
    partners: IPartner[]
}

export interface ILegalPersonGetResponse extends ILegalPersonCreate {
    company_key: string
    company_name: string
    client_status: ClientStatus
    analysis_status: AnalysisStatus
    created_at: string
    client_status_events: {
        new_status: ClientStatus
        event_date: string
        observation: null | string
        analyst_name: null | string
        analyst_email: null | string
        analyst_key: null | string
    }[]
    analysis_status_events: {
        new_status: AnalysisStatus
        event_date: string
        observation: null | string
        analyst_name: null | string
        analyst_email: null | string
        analyst_key: null | string
    }[]
}
