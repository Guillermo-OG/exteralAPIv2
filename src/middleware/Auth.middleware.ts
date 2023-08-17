import { NextFunction, Request, Response } from 'express'
import { UnauthorizedError } from '../models'
import { AuthService, OnboardingService, QiTechService } from '../services'
import { QiTechClient, QiTechTypes } from '../infra'
import env from '../config/env'

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
            console.log({ type: 'ONBOARDING', webhooktype: req.headers['webhook-type'], headers: req.headers, body: req.body })

            const onboardingService = OnboardingService.getInstance()
            onboardingService.authenticateWebhook(req)

            next()
        } catch (error) {
            next(error)
        }
    }

    public async authQiTechWebhook(req: Request, _res: Response, next: NextFunction): Promise<void> {
        try {

            const client = new QiTechClient({
                apiKey: env.QITECH_API_KEY,
                baseUrl: env.QITECH_BASE_URL,
                privateKey: env.QITECH_PRIVATE_KEY,
                passphrase: env.QITECH_PRIVATE_KEY_PASSPHRASE,
                qiPublicKey: env.QITECH_PUBLIC_KEY,
            })

            const decodedBody = await client.decodeMessage<QiTechTypes.Common.IWebhook>('/webhook/account', 'POST', req.headers, req.body)
            console.log({ type: 'ACCOUNT', webhooktype: req.headers['webhook-type'], headers: req.headers, body: decodedBody })

            const qiTechService = QiTechService.getInstance()
            qiTechService.authenticateWebhook(req)

            next()
        } catch (error) {
            next(error)
        }
    }
}
