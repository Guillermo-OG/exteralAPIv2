import { model, Schema } from 'mongoose'
import { QITech } from '../infra'

export interface IOnboardingLegalPerson {
    document: string
    request: QITech.ILegalPersonCreate
    response: QITech.ILegalPersonCreateResponse
    data?: QITech.ILegalPersonGetResponse
}

const schema = new Schema<IOnboardingLegalPerson>(
    {
        document: { type: String, required: true },
        request: { type: Schema.Types.Mixed, required: true },
        response: { type: Schema.Types.Mixed, required: true },
        data: { type: Schema.Types.Mixed, required: false },
    },
    {
        collection: 'onboarding_legal_person',
        timestamps: true,
    }
)

export const OnboardingLegalPerson = model<IOnboardingLegalPerson>('OnboardingLegalPerson', schema)
