import { Router } from 'express'
import { OnboardingController } from '../controllers'
import { AuthMiddleware, ValidationMiddleware } from '../middleware'
import { onboardingPersonListSchema } from '../utils/schemas'

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

        this.router.post('/natural_person', this.controller.createNaturalPerson)
        this.router.get(
            '/natural_person',
            this.validator.validate({ query: onboardingPersonListSchema }),
            this.controller.listNaturalPerson
        )
        this.router.get('/natural_person/:document', this.controller.getNaturalPersonByDocument)

        this.router.post('/legal_person', this.controller.createLegalPerson)
        this.router.get('/legal_person', this.validator.validate({ query: onboardingPersonListSchema }), this.controller.listLegalPerson)
        this.router.get('/legal_person/:document', this.controller.getLegalPersonByDocument)
    }
}
