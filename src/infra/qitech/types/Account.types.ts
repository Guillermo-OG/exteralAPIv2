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

export interface IAccountOwner {
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

export interface IAccountCreate {
    account_owner: IAccountOwner
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
