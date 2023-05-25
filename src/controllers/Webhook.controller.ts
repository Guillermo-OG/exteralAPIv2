import { NextFunction, Request, Response } from 'express'
import { Onboarding } from '../infra'
import { NotificationService, OnboardingService, QiTechService } from '../services'

export class WebhookController {
    public async handleOnboardingWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const body = req.body as Onboarding.IWebhookBody

            const service = OnboardingService.getInstance()
            const notificationService = NotificationService.getInstance()

            const { payload, url } = await service.handleWebhook(body)
            if (!req.user) throw new Error('Route unavailable')

            const notification = await notificationService.create(payload, url, req.user)

            await notificationService.notify(notification)
            res.send('ok')
        } catch (error) {
            next(error)
        }
    }

    public async handleQITechBaaSWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await QiTechService.getInstance().handleWebhook(req)
            res.status(200).send('ok')
        } catch (error) {
            next(error)
        }
    }
}
