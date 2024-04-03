import { Router } from 'express'
import multer, { Multer, memoryStorage } from 'multer'
import { AccountController } from '../controllers'
import { StatusController } from '../controllers'
import { AuthMiddleware, ValidationMiddleware } from '../middleware'
import { fileCreateSchema } from '../utils/schemas'
import { CreateAccountSchema } from '../utils/schemas/account/createAccountSchema'

export class AccountRouter {
    public readonly router: Router
    private readonly controller: AccountController
    private readonly statusController: StatusController
    private readonly authMiddleware: AuthMiddleware
    private readonly validationMiddleware: ValidationMiddleware
    private readonly upload: Multer

    constructor() {
        this.router = Router()
        this.controller = new AccountController()
        this.statusController = new StatusController()
        this.authMiddleware = new AuthMiddleware()
        this.validationMiddleware = new ValidationMiddleware()
        this.upload = multer({ storage: memoryStorage() })
        this.config()
    }

    private config(): void {
        this.router.use(this.authMiddleware.authenticate)

        this.router.get('/list/:document', this.controller.getByDocument)
        this.router.get('/listQiTechAccounts/:document', this.controller.listQiTechByDocument)
        this.router.get('/status/:document', this.statusController.getStatusByDocument)
        this.router.get('/contactDetails/:document', this.controller.getContactDetailsByDocument)
        this.router.post('/decode', this.controller.decodeBody)
        this.router.get('/', this.controller.handleListAllAccounts)
        this.router.get('/qitech/:accountKey', this.controller.getByAccountKeyFromQITech)
        // this.router.get('/allPixLimits', this.controller.handleListAllAccountsWithPixLimits)
        this.router.post('/', this.validationMiddleware.validate({ body: CreateAccountSchema }), this.controller.createAccount)

        this.router.get('/file', this.controller.listFiles)
        this.router.post(
            '/file',
            this.upload.single('file'),
            this.validationMiddleware.validate({ body: fileCreateSchema }),
            this.controller.uploadFile
        )
        this.router.patch('/cancel/:accountKey', this.controller.cancelAccount)
    }
}
