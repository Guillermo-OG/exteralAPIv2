import { IApiUser } from 'models'
import { HydratedDocument } from 'mongoose'

declare global {
    namespace Express {
        export interface Request {
            user: HydratedDocument<IApiUser>
        }
    }
}
