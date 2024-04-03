import { Schema, model, Document, HydratedDocument } from 'mongoose'
import { QiTechTypes } from '../infra'

interface IRelatedPerson extends QiTechTypes.Account.IOwnerPF, Document {
    owner_person_key?: string
}

const RelatedPersonSchema = new Schema<IRelatedPerson>(
    {
        address: {
            street: { type: String, required: true },
            number: { type: String, required: true },
            neighborhood: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            postal_code: { type: String, required: true },
            complement: { type: String, required: false },
        },
        phone: {
            country_code: { type: String, required: false },
            number: { type: String, required: false },
            area_code: { type: String, required: false },
        },
        email: { type: String, required: true },
        name: { type: String, required: true },
        person_type: { type: String, required: true, enum: ['natural', 'legal'] },
        nationality: { type: String, required: true },
        birth_date: { type: String, required: true },
        mother_name: { type: String, required: true },
        is_pep: { type: Boolean, required: true },
        individual_document_number: { type: String, required: true },
        document_identification: { type: String, required: false },
        document_identification_type: { type: String, required: false, enum: ['cnh', 'rg'] },
        face: {
            type: { type: String, required: false },
            registration_key: { type: String, required: false },
        },
        owner_person_key: { type: String, required: false },
    },
    {
        timestamps: true,
        collection: 'RelatedPersons',
    }
)

export type RelatedPersonModel = HydratedDocument<IRelatedPerson>
export const RelatedPerson = model<IRelatedPerson>('RelatedPerson', RelatedPersonSchema)
