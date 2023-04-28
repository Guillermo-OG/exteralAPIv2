import { HydratedDocument } from 'mongoose'
import { v4 } from 'uuid'
import { ApiUserModel, IApiUser } from '../models'

export class ApiUserRepository {
    private static instance: ApiUserRepository

    public static getInstance(): ApiUserRepository {
        if (!ApiUserRepository.instance) {
            ApiUserRepository.instance = new ApiUserRepository()
        }
        return ApiUserRepository.instance
    }

    public async createApiUser(name: string): Promise<HydratedDocument<IApiUser>> {
        const user = await ApiUserModel.create({
            name: name,
            isActive: true,
            apiKey: v4(),
            apiSecret: Buffer.from(v4()).toString('hex'),
        })
        return user
    }

    public async getByCredentials(apiKey: string, apiPassword: string): Promise<HydratedDocument<IApiUser> | null> {
        const user = await ApiUserModel.findOne({
            apiKey,
            apiSecret: apiPassword,
        })
        return user
    }
}
