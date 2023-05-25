import { Router } from 'express'
import { AuthMiddleware } from '../middleware'
import { PixKeyController } from '../controllers'

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
