import { NextFunction, Request, Response } from 'express'
import { OnboardingTypes } from '../infra'
import { NotificationService, OnboardingService, QiTechService } from '../services'
import env from '../config/env'
import { IOnboarding } from '../models'

export class WebhookController {
    public async handleOnboardingWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            const body = req.body as OnboardingTypes.IWebhookBody

            const service = OnboardingService.getInstance()
            const notificationService = NotificationService.getInstance()

            const { payload, url, createdAccount } = await service.handleWebhook(body)

            const apiUserId = createdAccount?.apiUserId || env.VBB_API_USER_ID
            if (!req.user) {
                req.user = { id: apiUserId }
            }

            const onboarding: IOnboarding = payload as IOnboarding

            const notification = await notificationService.create(payload, url, req.user)
            await notificationService.notify(notification)

            console.log('webhook response', { url, payload, createdAccount })

            res.send({ notificated: 'ok', onboarding })
        } catch (error) {
            next(await qiTechService.decodeError(error))
        }
    }

    // public async handlePendingAnalysis(_req: Request, res: Response, next: NextFunction): Promise<void> {
    //     const qiTechService = QiTechService.getInstance()
    //     try {
    //         await QiTechService.getInstance().handlePendingAnalysis()
    //         res.status(200).send('ok')
    //     } catch (error) {
    //         next(await qiTechService.decodeError(error))
    //     }
    // }

    public async handleAccountCreation(_req: Request, res: Response, next: NextFunction): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            await QiTechService.getInstance().handleAccountCreation()
            res.status(200).send('ok')
        } catch (error) {
            next(await qiTechService.decodeError(error))
        }
    }

    public async handleQITechBaaSWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            await QiTechService.getInstance().handleWebhook(req)
            res.status(200).send('ok')
        } catch (error) {
            next(await qiTechService.decodeError(error))
        }
    }
}
