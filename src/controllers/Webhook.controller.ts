import { NextFunction, Request, Response } from 'express'
import { OnboardingTypes } from '../infra'
import { NotificationService, OnboardingService, QiTechService } from '../services'

export class WebhookController {
    public async handleOnboardingWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            const body = req.body as OnboardingTypes.IWebhookBody
            const service = OnboardingService.getInstance()
            const notificationService = NotificationService.getInstance()

            const { payload, url, createdAccount } = await service.handleWebhook(body)

            if (!req.user) {
                req.user = { id: createdAccount?.apiUserId }
            }

            const notification = await notificationService.create(payload, url, req.user)
            await notificationService.notify(notification)
            res.send('ok')
        } catch (error) {
            await qiTechService.decodeError(error)
        }
    }

    public async handlePendingAnalysis(_req: Request, res: Response, next: NextFunction): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            await QiTechService.getInstance().handlePendingAnalysis()
            res.status(200).send('ok')
        } catch (error) {
            console.error(error)
            await qiTechService.decodeError(error)
        }
    }

    public async handleAccountCreation(_req: Request, res: Response, next: NextFunction): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            await QiTechService.getInstance().handleAccountCreation()
            res.status(200).send('ok')
        } catch (error) {
            await qiTechService.decodeError(error)
        }
    }

    public async handleQITechBaaSWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            await QiTechService.getInstance().handleWebhook(req)
            res.status(200).send('ok')
        } catch (error) {
            await qiTechService.decodeError(error)
        }
    }
}
