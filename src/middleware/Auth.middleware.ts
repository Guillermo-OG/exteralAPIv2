import { NextFunction, Request, Response } from 'express'
import { UnauthorizedError } from '../models'
import { AuthService, OnboardingService, QiTechService } from '../services'

export class AuthMiddleware {
    public async authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
        try {
            const authHeader = req.headers.authorization

            if (!authHeader || !authHeader.startsWith('Basic ')) {
                throw new UnauthorizedError('Unauthorized')
            }

            const credentials = authHeader.slice('Basic '.length)
            const decoded = Buffer.from(credentials, 'base64').toString('ascii')
            const [key, password] = decoded.split(':')

            const authService = AuthService.getInstance()
            const loggedUser = await authService.authenticate(key, password)
            req.user = loggedUser

            next()
        } catch (error) {
            next(error)
        }
    }

    public async authOnboardingWebhook(req: Request, _res: Response, next: NextFunction): Promise<void> {
        try {
            const onboardingService = OnboardingService.getInstance()
            onboardingService.authenticateWebhook(req)

            next()
        } catch (error) {
            next(error)
        }
    }

    public async authQiTechWebhook(req: Request, _res: Response, next: NextFunction): Promise<void> {
        try {
            const qiTechService = QiTechService.getInstance()
            // qiTechService.authenticateWebhook(req)
            console.log(qiTechService, req)
            console.log({ headers: req.headers, body: req.body })

            next()
        } catch (error) {
            next(error)
        }
    }
}
