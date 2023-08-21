import { NextFunction, Request, Response } from 'express'
import { OnboardingTypes } from '../infra'
import { NotificationService, OnboardingService, QiTechService } from '../services'

export class WebhookController {
    public async handleOnboardingWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // const body = JSON.parse(req.body as string) as OnboardingTypes.IWebhookBody
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
            next(error)
        }
    }

    public async handlePendingAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            console.log(req)
            await QiTechService.getInstance().handlePendingAnalysis()
            res.status(200).send('ok')
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
