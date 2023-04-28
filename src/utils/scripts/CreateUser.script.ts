import process from 'process'
import Database from '../../config/database'
import { ApiUserRepository } from '../../repository/ApiUser.repository'

async function createUser(): Promise<void> {
    const database = Database.getInstance()
    await database.start()
    const nameArg: string = process.argv[2]
    if (!nameArg) {
        console.error('ERROR: Insert new client name after command')
        process.exit(-1)
    }

    const userRepository = ApiUserRepository.getInstance()
    const user = await userRepository.createApiUser(nameArg)
    console.log('New User Created:')
    console.log({
        name: user.name,
        apiKey: user.apiKey,
        apiSecret: user.apiSecret,
        isActive: user.isActive,
    })
    await database.disconnect()
    process.exit(1)
}

createUser()
