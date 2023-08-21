import { Router } from 'express'
import { WebhookController } from '../controllers'
import { AuthMiddleware } from '../middleware'

export class WebhookRouter {
    public readonly router: Router
    private readonly controller: WebhookController
    private readonly authMiddleware: AuthMiddleware

    constructor() {
        this.router = Router()
        this.controller = new WebhookController()
        this.authMiddleware = new AuthMiddleware()
        this.config()
    }

    private config(): void {
        this.router.post('/onboarding', this.authMiddleware.authOnboardingWebhook, this.controller.handleOnboardingWebhook)
        this.router.post('/account', this.authMiddleware.authQiTechWebhook, this.controller.handleQITechBaaSWebhook)

        this.router.get('/onboarding/analysis', this.controller.handlePendingAnalysis)
    }
}
