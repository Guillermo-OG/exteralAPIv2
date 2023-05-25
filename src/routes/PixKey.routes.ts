import { Router } from 'express'
import { PixKeyController } from '../controllers/PixKey.controller'
import { AuthMiddleware } from '../middleware'

export class PixKeyRouter {
    public readonly router: Router
    private readonly controller: PixKeyController
    private readonly authMiddleware: AuthMiddleware

    constructor() {
        this.router = Router()
        this.controller = new PixKeyController()
        this.authMiddleware = new AuthMiddleware()
        this.config()
    }

    private config(): void {
        this.router.use(this.authMiddleware.authenticate)
        this.router.get('/', this.controller.listByDocument)
    }
}
