import { NextFunction, Request, Response, Router } from 'express'
import mongoose from 'mongoose'

export class HealthRouter {
    public readonly router: Router
    constructor() {
        this.router = Router()
        this.config()
    }

    private config(): void {
        this.router.get('/', (_req: Request, res: Response, next: NextFunction) => {
            try {
                const dbConnected = !!mongoose.connection?.host
                let status = 200,
                    message = 'Database connected'

                if (!dbConnected) {
                    status = 500
                    message = 'Database not connected'
                }
                res.status(status).json({
                    database: message,
                })
            } catch (error) {
                next(error)
            }
        })
    }
}
