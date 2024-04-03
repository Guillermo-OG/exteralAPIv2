import { Router } from 'express'
import { PersonController } from '../controllers'
import { AuthMiddleware, ValidationMiddleware } from '../middleware'
import {
    PersonCreationSchema,
    LinkPersonToCompanySchema,
    UnlinkPersonToCompanySchema,
    UpdateProfessionalDataContactSchema,
    UpdatePersonDataContactSchema,
} from '../utils/schemas'

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

        //obtem pessoas relacionadas à uma empresa
        this.router.get('/getRelatedPersons/:document', this.controller.getRelatedPersonsByDocument)

        //cria a pessoa na qitech (solicita token)
        this.router.post(
            '/createPersonTokenRequest',
            this.validator.validate({
                body: PersonCreationSchema,
                context: { isTokenRequired: false },
            }),
            this.controller.createPersonTokenRequest
        )

        //cria a pessoa na qitech (valida token)
        this.router.post(
            '/validatePersonToken',
            this.validator.validate({
                body: PersonCreationSchema,
                context: { isTokenRequired: true },
            }),
            this.controller.validateCreatePersonToken
        )

        //vincula a pessoa à uma empresa (solicita token)
        this.router.post(
            '/createPersonLinkTokenRequest',
            this.validator.validate({ body: LinkPersonToCompanySchema, context: { isTokenRequired: false } }),
            this.controller.createPersonLinkTokenRequest
        )
        //vincula a pessoa à uma empresa (valida token)
        this.router.post(
            '/validatePersonLinkToken',
            this.validator.validate({ body: LinkPersonToCompanySchema, context: { isTokenRequired: true } }),
            this.controller.validatePersonLinkToken
        )

        //vincula a pessoa à uma empresa (solicita token)
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

        this.router.post(
            '/updateProfessionalDataContactTokenRequest',
            this.validator.validate({ body: UpdateProfessionalDataContactSchema, context: { isTokenRequired: false } }),
            this.controller.updateProfessionalDataContactTokenRequest
        )
        this.router.post(
            '/validateProfessionalUpdateDataContactToken',
            this.validator.validate({ body: UpdateProfessionalDataContactSchema, context: { isTokenRequired: true } }),
            this.controller.validateProfessionalUpdateDataContactToken
        )
        // this.router.post(
        //     '/updateProfessionalDataContactTokenRequest',
        //     this.validator.validate({ body: UpdatePersonDataContactSchema, context: { isTokenRequired: false } }),
        //     this.controller.updatePersonDataContactTokenRequest
        // )
        // this.router.post(
        //     '/validateProfessionalUpdateDataContactToken',
        //     this.validator.validate({ body: UpdatePersonDataContactSchema, context: { isTokenRequired: true } }),
        //     this.controller.validatePersonUpdateDataContactToken
        // )
    }
}
