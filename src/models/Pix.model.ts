import { HydratedDocument, model, Schema } from 'mongoose'

export enum PixStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export enum PixKeyType {
    'RANDOM_KEY' = 'random_key',
}

export interface IPix {
    accountId: Schema.Types.ObjectId
    document: string
    key?: string
    status?: PixStatus
    request: any
    response: any
    data?: any
    type: PixKeyType
}

const schema = new Schema<IPix>(
    {
        document: { type: String, required: true },
        key: { type: String, required: false },
        status: { type: String, required: true, default: PixStatus.PENDING },
        request: { type: Schema.Types.Mixed, required: true },
        response: { type: Schema.Types.Mixed, required: true },
        data: { type: Schema.Types.Mixed, required: false },
        accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
        type: { type: String, required: true },
    },
    {
        collection: 'pix',
        timestamps: true,
    }
)

export type PixModel = HydratedDocument<IPix>
export const Pix = model<IPix>('Pix', schema)
