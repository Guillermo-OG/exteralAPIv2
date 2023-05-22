import { HydratedDocument, model, Schema } from 'mongoose'

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
    request: any
    response?: any
    data?: any
}

const schema = new Schema<IAccount>(
    {
        document: { type: String, required: true },
        type: { type: String, required: true },
        status: { type: String, required: true, default: AccountStatus.PENDING },
        request: { type: Schema.Types.Mixed, required: true },
        response: { type: Schema.Types.Mixed, required: false },
        data: { type: Schema.Types.Mixed, required: false },
    },
    {
        collection: 'account',
        timestamps: true,
    }
)

export type AccountModel = HydratedDocument<IAccount>
export const Account = model<IAccount>('Account', schema)
