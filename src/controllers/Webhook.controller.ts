import { NextFunction, Request, Response } from 'express'
import { QueueService } from '../services'

export class WebhookController {
    public async handleOnboardingWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        const queueService = QueueService.getInstance()
        try {
            const messageData = {
                type: 'onboarding',
                data: req.body,
                user: req.user,
            }

            await queueService.sendMessage(messageData)
            res.status(202).send({ message: 'Request received and queued' })
        } catch (error) {
            next(error)
        }
    }

    public async handleAccountCreation(req: Request, res: Response, next: NextFunction): Promise<void> {
        const queueService = QueueService.getInstance()
        try {
            await queueService.sendMessage({ type: 'accountCreation', data: req.body })
            res.status(202).send({ message: 'Request received and queued' })
        } catch (error) {
            next(error)
        }
    }

    public async handleQITechBaaSWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        const queueService = QueueService.getInstance()
        try {
            await queueService.sendMessage({ type: 'qiTechBaaS', data: req.body, headers: req.headers })
            res.status(202).send({ message: 'Request received and queued' })
        } catch (error) {
            next(error)
        }
    }
}
