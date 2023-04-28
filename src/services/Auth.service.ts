import { HydratedDocument } from 'mongoose'
import { IApiUser, UnauthorizedError } from '../models'
import { ApiUserRepository } from '../repository/ApiUser.repository'

export class AuthService {
    private static instance: AuthService

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService()
        }

        return AuthService.instance
    }

    public async authenticate(apiKey: string, apiPassword: string): Promise<HydratedDocument<IApiUser>> {
        const apiUserRepository = ApiUserRepository.getInstance()

        const apiUser = await apiUserRepository.getByCredentials(apiKey, apiPassword)
        if (!apiUser || (apiUser && !apiUser.isActive)) {
            throw new UnauthorizedError()
        }

        return apiUser
    }
}
