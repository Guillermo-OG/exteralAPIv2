import { Router } from 'express'
import { PersonController } from '../controllers'
import { AuthMiddleware, ValidationMiddleware } from '../middleware'
import { PersonCreationSchema, LinkPersonToCompanySchema, UnlinkPersonToCompanySchema } from '../utils/schemas'

export class PersonRouter {
    public readonly router: Router
    private readonly controller: PersonController
    private readonly validator: ValidationMiddleware

    constructor() {
        this.router = Router()
        this.controller = new PersonController()
        this.validator = new ValidationMiddleware()
        this.config()
    }

    private config(): void {
        this.router.use(new AuthMiddleware().authenticate)

        this.router.post(
            '/createPersonTokenRequest',
            this.validator.validate({
                body: PersonCreationSchema,
                context: { isTokenRequired: false },
            }),
            this.controller.createPersonTokenRequest
        )

        this.router.post(
            '/validatePersonToken',
            this.validator.validate({
                body: PersonCreationSchema,
                context: { isTokenRequired: true },
            }),
            this.controller.validatePersonToken
        )

        this.router.post(
            '/createPersonLinkTokenRequest',
            this.validator.validate({ body: LinkPersonToCompanySchema, context: { isTokenRequired: false } }),
            this.controller.createPersonLinkTokenRequest
        )
        this.router.post(
            '/validatePersonLinkToken',
            this.validator.validate({ body: LinkPersonToCompanySchema, context: { isTokenRequired: true } }),
            this.controller.validatePersonLinkToken
        )

        this.router.post(
            '/deletePersonLinkTokenRequest',
            this.validator.validate({ body: UnlinkPersonToCompanySchema, context: { isTokenRequired: false } }),
            this.controller.deletePersonLinkTokenRequest
        )
        this.router.post(
            '/validateDeletePersonLinkToken',
            this.validator.validate({ body: UnlinkPersonToCompanySchema, context: { isTokenRequired: true } }),
            this.controller.validateDeletePersonLinkToken
        )
    }
}
