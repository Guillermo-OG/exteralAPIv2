import { Router } from 'express'
import { AuthMiddleware, ValidationMiddleware } from '../middleware'
import { AccountController } from '../controllers'
import multer, { Multer, memoryStorage } from 'multer'
import { fileCreateSchema } from '../utils/schemas'

export class AccountRouter {
    public readonly router: Router
    private readonly controller: AccountController
    private readonly authMiddleware: AuthMiddleware
    private readonly validationMiddleware: ValidationMiddleware
    private readonly upload: Multer

    constructor() {
        this.router = Router()
        this.controller = new AccountController()
        this.authMiddleware = new AuthMiddleware()
        this.validationMiddleware = new ValidationMiddleware()
        this.upload = multer({ storage: memoryStorage() })
        this.config()
    }

    private config(): void {
        this.router.use(this.authMiddleware.authenticate)
        this.router.post('/', this.controller.createAccount)
        this.router.get('/file', this.controller.listFiles)
        this.router.get('/:document', this.controller.getByDocument)
        this.router.post(
            '/file',
            this.upload.single('file'),
            this.validationMiddleware.validate({ body: fileCreateSchema }),
            this.controller.uploadFile
        )
    }
}
