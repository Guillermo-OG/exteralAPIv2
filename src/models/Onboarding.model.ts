import { HydratedDocument, model, Schema } from 'mongoose'
import { Onboarding as OnboardingTypes } from '../infra'

interface IUnknownError {
    [attr: string]: unknown
}

export interface IOnboarding {
    document: string
    status: OnboardingTypes.RequestStatus
    request: OnboardingTypes.ILegalPersonCreate | OnboardingTypes.INaturalPersonCreate
    response?: OnboardingTypes.ILegalPersonCreateResponse | OnboardingTypes.INaturalPersonCreateResponse
    data?: OnboardingTypes.ILegalPersonGetResponse | OnboardingTypes.INaturalPersonGetResponse
    error?: IUnknownError
}

const schema = new Schema<IOnboarding>(
    {
        document: { type: String, required: true },
        status: { type: String, required: true, default: OnboardingTypes.RequestStatus.PENDING },
        request: { type: Schema.Types.Mixed, required: true },
        response: { type: Schema.Types.Mixed, required: false },
        data: { type: Schema.Types.Mixed, required: false },
        error: { type: Schema.Types.Mixed, required: false },
    },
    {
        collection: 'onboarding_legal_person',
        timestamps: true,
    }
)

export type OnboardingModel = HydratedDocument<IOnboarding>
export const Onboarding = model<IOnboarding>('Onboarding', schema)
