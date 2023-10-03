import { Schema, model } from 'mongoose'

export interface IPixLimitsRequest {
    document: string
    request: unknown
    response: string // Ajuste o tipo de acordo com o que você espera aqui
    data?: unknown
}

const pixLimitsRequestSchema = new Schema<IPixLimitsRequest>(
    {
        document: { type: String, required: false },
        request: { type: Schema.Types.Mixed, required: false },
        response: { type: Schema.Types.Mixed, required: false },
        data: { type: Schema.Types.Mixed, required: false },
    },
    {
        timestamps: true,
        collection: 'pixLimitsRequest',
    }
)

export const PixLimitsRequest = model<IPixLimitsRequest>('PixLimitsRequest', pixLimitsRequestSchema)
