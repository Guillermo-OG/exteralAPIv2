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
            const notification = await notificationService.create(payload, url)

            await notificationService.notify(notification)
            res.send('ok')
        } catch (error) {
            next(error)
        }
    }

    public async handleAccountWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            console.log(req.headers)
            console.log(req.body)
            console.log(await QiTechService.getInstance().decode(req.headers, req.body))
            res.status(200).send('ok')
        } catch (error) {
            console.log(error)
            next(error)
        }
    }
}
