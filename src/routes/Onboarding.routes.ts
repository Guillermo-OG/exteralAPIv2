import { Router } from 'express'
import { OnboardingController } from '../controllers'
import { AuthMiddleware, ValidationMiddleware } from '../middleware'
import { legalPersonSchema, naturalPersonSchema, onboardingPersonListSchema } from '../utils/schemas'

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

        this.router.post('/natural_person', this.validator.validate({ body: naturalPersonSchema }), this.controller.createNaturalPerson)
        this.router.get(
            '/natural_person',
            this.validator.validate({ query: onboardingPersonListSchema }),
            this.controller.listNaturalPerson
        )
        this.router.get('/natural_person/:document', this.controller.getNaturalPersonByDocument)
        this.router.put('/natural_person/retry', this.controller.retryNaturalPersonByDocument)

        this.router.post('/legal_person', this.validator.validate({ body: legalPersonSchema }), this.controller.createLegalPerson)
        this.router.get('/legal_person', this.validator.validate({ query: onboardingPersonListSchema }), this.controller.listLegalPerson)
        this.router.get('/legal_person/:document', this.controller.getLegalPersonByDocument)
        this.router.put('/legal_person/retry', this.controller.retryLegalPersonByDocument)
    }
}
