import { connect } from 'mongoose'
import env from './env'

export default class Database {
    private static instance: Database
    private connection: typeof import('mongoose') | undefined = undefined

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database()
        }
        return Database.instance
    }

    public async start(): Promise<void> {
        console.log('Database: Connecting...')
        try {
            if (this.connection) {
                return
            }
            this.connection = await connect(env.MONGO_URL, {
                dbName: env.DATABASE_NAME,
            })
            console.log('Database: Connected!')
        } catch (error) {
            console.log('Database: Not Connected!')
        }
    }

    public async disconnect(): Promise<void> {
        if (this.connection) {
            await this.connection.disconnect()
        }
    }
}
