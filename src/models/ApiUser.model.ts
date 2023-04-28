import { model, Schema } from 'mongoose'

export interface IApiUser {
    name: string
    apiKey: string
    apiSecret: string
    isActive: boolean
}

const apiUserSchema = new Schema<IApiUser>(
    {
        name: { type: String, required: true, unique: true },
        apiKey: { type: String, required: true, unique: true },
        apiSecret: { type: String, required: true, unique: true },
        isActive: { type: Boolean, required: true },
    },
    {
        collection: 'api_users',
        timestamps: true,
    }
)

export const ApiUserModel = model<IApiUser>('ApiUser', apiUserSchema)
