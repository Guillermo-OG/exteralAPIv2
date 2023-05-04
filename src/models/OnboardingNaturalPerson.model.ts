import { model, Schema } from 'mongoose'
import { QITech } from '../infra'

export interface IOnboardingNaturalPerson {
    document: string
    request: QITech.INaturalPersonCreate
    response: QITech.INaturalPersonCreateResponse
    data?: QITech.INaturalPersonGetResponse
}

const schema = new Schema<IOnboardingNaturalPerson>(
    {
        document: { type: String, required: true },
        request: { type: Schema.Types.Mixed, required: true },
        response: { type: Schema.Types.Mixed, required: true },
        data: { type: Schema.Types.Mixed, required: false },
    },
    {
        collection: 'onboarding_natural_person',
        timestamps: true,
    }
)

export const OnboardingNaturalPerson = model<IOnboardingNaturalPerson>('OnboardingNaturalPerson', schema)
