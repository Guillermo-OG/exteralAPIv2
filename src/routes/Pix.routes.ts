import { Router } from 'express'
import { PixController } from '../controllers/Pix.controller'
import { AuthMiddleware } from '../middleware'

export class PixRouter {
    public readonly router: Router
    private readonly controller: PixController
    private readonly authMiddleware: AuthMiddleware

    constructor() {
        this.router = Router()
        this.controller = new PixController()
        this.authMiddleware = new AuthMiddleware()
        this.config()
    }

    private config(): void {
        this.router.use(this.authMiddleware.authenticate)
        this.router.get('/', this.controller.listByDocument)
    }
}
