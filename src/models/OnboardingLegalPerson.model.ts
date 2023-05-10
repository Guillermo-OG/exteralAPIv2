import { model, Schema } from 'mongoose'
import { QITech } from '../infra'

interface IUnknownError {
    [attr: string]: unknown
}

export interface IOnboardingLegalPerson {
    document: string
    status: QITech.RequestStatus
    request: QITech.ILegalPersonCreate
    response?: QITech.ILegalPersonCreateResponse
    data?: QITech.ILegalPersonGetResponse
    error?: IUnknownError
}

const schema = new Schema<IOnboardingLegalPerson>(
    {
        document: { type: String, required: true },
        status: { type: String, required: true, default: QITech.RequestStatus.PENDING },
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

export const OnboardingLegalPerson = model<IOnboardingLegalPerson>('OnboardingLegalPerson', schema)
