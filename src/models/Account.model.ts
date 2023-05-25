import { model, Schema } from 'mongoose'

export enum AccountType {
    PF = 'PF',
    PJ = 'PJ',
}

export enum AccountStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export interface IAccount {
    document: string
    type: AccountType
    status: AccountStatus
    callbackURL: string
    request: unknown
    response?: unknown
    data?: unknown
    apiUserId: Schema.Types.ObjectId
}

const schema = new Schema<IAccount>(
    {
        document: { type: String, required: true },
        callbackURL: { type: String, required: true },
        type: { type: String, required: true },
        status: { type: String, required: true, default: AccountStatus.PENDING },
        request: { type: Schema.Types.Mixed, required: true },
        response: { type: Schema.Types.Mixed, required: false },
        data: { type: Schema.Types.Mixed, required: false },
        apiUserId: { type: Schema.Types.ObjectId, ref: 'ApiUser', required: true },
    },
    {
        collection: 'account',
        timestamps: true,
    }
)

export const Account = model<IAccount>('Account', schema)
