import { Router } from 'express'
import { OnboardingController } from '../controllers'
import { AuthMiddleware, ValidationMiddleware } from '../middleware'
import { onboardingPersonListSchema } from '../utils/schemas'
import { CreateAccountSchema } from '../utils/schemas/account/createAccountSchema'

export class OnboardingRouter {
    public readonly router: Router
    private readonly controller: OnboardingController
    private readonly validator: ValidationMiddleware

    constructor() {
        this.router = Router()
        this.controller = new OnboardingController()
        this.validator = new ValidationMiddleware()
        this.config()
    }

    private config(): void {
        this.router.use(new AuthMiddleware().authenticate)

        this.router.get('/', this.validator.validate({ query: onboardingPersonListSchema }), this.controller.listOnboarding)
        this.router.get('/:document', this.controller.getByDocument)
        this.router.get('/analysis/:document', this.controller.getAnalysis)
        this.router.post('/create', this.validator.validate({ body: CreateAccountSchema }), this.controller.createOnboarding)
    }
}
