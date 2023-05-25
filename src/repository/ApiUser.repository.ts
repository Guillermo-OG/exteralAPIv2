import { FilterQuery, HydratedDocument, ObjectId } from 'mongoose'
import { v4 } from 'uuid'
import { ApiUser, IApiUser } from '../models'

export class ApiUserRepository {
    private static instance: ApiUserRepository

    public static getInstance(): ApiUserRepository {
        if (!ApiUserRepository.instance) {
            ApiUserRepository.instance = new ApiUserRepository()
        }
        return ApiUserRepository.instance
    }

    public async createApiUser(name: string): Promise<HydratedDocument<IApiUser>> {
        const user = await ApiUser.create({
            name: name,
            isActive: true,
            apiKey: v4(),
            apiSecret: Buffer.from(v4()).toString('hex'),
        })
        return user
    }

    public async getById(id: ObjectId | string, isActive?: boolean): Promise<HydratedDocument<IApiUser> | null> {
        const whereOptions: FilterQuery<IApiUser> = {
            _id: id.toString(),
        }

        if (typeof isActive === 'boolean') {
            whereOptions.isActive = isActive
        }

        return await ApiUser.findOne(whereOptions)
    }

    public async getByCredentials(apiKey: string, apiPassword: string): Promise<HydratedDocument<IApiUser> | null> {
        const user = await ApiUser.findOne({
            apiKey,
            apiSecret: apiPassword,
        })
        return user
    }
}
