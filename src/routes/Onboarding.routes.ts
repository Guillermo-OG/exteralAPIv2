import { Router } from 'express'
import { OnboardingController } from '../controllers'
import { AuthMiddleware } from '../middleware'

export class OnboardingRouter {
    public readonly router: Router
    private readonly controller: OnboardingController
    constructor() {
        this.router = Router()
        this.controller = new OnboardingController()
        this.config()
    }

    private config(): void {
        this.router.use(new AuthMiddleware().authenticate)

        this.router.post('/natural_person', this.controller.createNaturalPerson)
        this.router.get('/natural_person', this.controller.getNaturalPersonByDocument)
        this.router.post('/legal_person', this.controller.createLegalPerson)
        this.router.get('/legal_person', this.controller.getLegalPersonByDocument)
    }
}
