import { model, Schema } from 'mongoose'
import { Onboarding } from '../infra'

interface IUnknownError {
    [attr: string]: unknown
}
export interface IOnboardingNaturalPerson {
    document: string
    status: Onboarding.RequestStatus
    request: Onboarding.INaturalPersonCreate
    response?: Onboarding.INaturalPersonCreateResponse
    data?: Onboarding.INaturalPersonGetResponse
    error?: IUnknownError
}

const schema = new Schema<IOnboardingNaturalPerson>(
    {
        document: { type: String, required: true },
        status: { type: String, required: true, default: Onboarding.RequestStatus.PENDING },
        request: { type: Schema.Types.Mixed, required: true },
        response: { type: Schema.Types.Mixed, required: false },
        data: { type: Schema.Types.Mixed, required: false },
        error: { type: Schema.Types.Mixed, required: false },
    },
    {
        collection: 'onboarding_natural_person',
        timestamps: true,
    }
)

export const OnboardingNaturalPerson = model<IOnboardingNaturalPerson>('OnboardingNaturalPerson', schema)
