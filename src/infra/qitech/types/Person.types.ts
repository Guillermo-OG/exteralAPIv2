export interface IUpdate {
    contact_type: string
    professional_data_contact_update: {
        professional_data_key: string
        natural_person: string
        email: string
        phone_number: PhoneNumberType
    }
    agent_document_number: string
}

export interface PhoneNumberType {
    country_code: string
    area_code: string
    number: string
}
