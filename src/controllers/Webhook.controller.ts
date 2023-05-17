import { NextFunction, Request, Response } from 'express'
import { QITech } from '../infra'
import { NotificationService, QiTechService } from '../services'

export class WebhookController {
    public async handleOnboardingWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const body = req.body as QITech.IWebhookBody

            const service = QiTechService.getInstance()
            const notificationService = NotificationService.getInstance()

            const { payload, url } = await service.handleWebhook(body)
            const notification = await notificationService.create(payload, url)

            await notificationService.notify(notification)
            res.send('ok')
        } catch (error) {
            next(error)
        }
    }
}
