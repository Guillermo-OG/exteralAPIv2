interface IAddress {
    street: string
    number: string
    neighborhood: string
    city: string
    state: string
    postal_code: string
}

interface IPhone {
    country_code: string
    number: string
    area_code: string
}

export enum AccountStatus {
    PENDING = 'pending_kyc_analysis',
    SUCCESS = 'account_opened',
    ERROR = 'account_rejected',
}

export enum CompanyType {
    ltda = 'ltda',
    sa = 'sa',
    micro_enterprise = 'micro_enterprise',
    freelancer = 'freelancer',
    sa_opened = 'sa_opened',
    sa_closed = 'sa_closed',
    se_ltda = 'se_ltda',
    se_cn = 'se_cn',
    se_cs = 'se_cs',
    se_ca = 'se_ca',
    scp = 'scp',
    ei = 'ei',
    ese = 'ese',
    eeab = 'eeab',
    ssp = 'ssp',
    ss_ltda = 'ss_ltda',
    ss_cn = 'ss_cn',
    ss_cs = 'ss_cs',
    eireli_ne = 'eireli_ne',
    eireli_ns = 'eireli_ns',
    eireli = 'eireli',
    mei = 'mei',
    me = 'me',
    cop = 'cop',
    private_association = 'private_association',
}

export interface IOwnerPF {
    address: IAddress
    phone: IPhone
    email: string
    name: string
    person_type: 'natural' | 'legal'
    nationality: string
    birth_date: string
    mother_name: string
    is_pep: boolean
    individual_document_number: string
    document_identification: string
    document_identification_type: 'cnh' | 'rg'
    revenue_amount: number
    profession: string
}

export interface IOwnerPJ {
    address: IAddress
    cnae_code: string
    company_statute: string
    company_document_number: string
    company_type: CompanyType
    email: string
    foundation_date: string
    name: string
    person_type: 'legal'
    phone: IPhone
    trading_name: string
    company_representatives: IOwnerPF[]
}

export interface ICreate {
    account_owner: IOwnerPF | IOwnerPJ
    allowed_user?: {
        email: string
        individual_document_number: string
        name: string
        person_type: 'natural'
        phone: {
            country_code: string
            area_code: string
            number: string
        }
    }
}

export interface ICreateResponse {
    data: {
        account_info: {
            account_branch: string
            account_digit: string
            account_number: string
            financial_institution_code: string
        }
        account_owner: {
            document_number: string
            name: string
        }
    }
    event_datetime: string
    key: string
    status: AccountStatus
    webhook_type: 'account'
}

export interface IList {
    account_block_reason: string | null
    account_branch: string
    account_credentials: {
        account_id: number
        created_at: string
        credential_type: {
            created_at: string
            enumerator: string
            id: number
            translation_path: string
        }
        credential_type_id: number
        id: number
        is_active: boolean
        person_key: string
        updated_at: string | null
    }[]
    account_digit: string
    account_documents: []
    account_events: {
        account_id: number
        created_at: string
        id: number
        new_account_status: {
            created_at: string
            enumerator: string
            id: number
            translation_path: string
        }
        new_account_status_id: number
        old_account_status: string | null
        old_account_status_id: number | null
    }[]
    account_key: string
    account_name: string
    account_number: string
    account_status: {
        created_at: string
        enumerator: string
        translation_path: string
    }
    account_type: {
        created_at: string
        enumerator: string
        translation_path: string
    }
    automatic_transfer_management_status: {
        created_at: string
        enumerator: string
    }
    automatic_transfers: []
    balance: number
    blocked_balance: number
    blocked_balance_events: []
    created_at: string
    destinations: []
    fee: number | null
    investment_available_amount: number
    investment_configuration: null
    is_system_account: boolean
    owner_document_number: string
    owner_name: string
    owner_person_key: string
    permitted_person_keys: string[]
    requester_key: string
    requester_name: string
    setup_fee: number | null
    transactional_limit: number | null
    webhook_enabled: boolean
}

export interface IAccountWebhook {
    key: string
    data: {
        account_info: {
            account_digit: string
            account_branch: string
            account_number: string
            financial_institution_code: string
        }
        account_owner: {
            name: string
            document_number: string
        }
    }
    status: AccountStatus
    webhook_type: string
    event_datetime: string
}
