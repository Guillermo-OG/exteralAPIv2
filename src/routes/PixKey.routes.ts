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
        this.router.get('/testCron', this.controller.triggerBillingJob)
        this.router.post('/create', this.controller.createPixKey)
        this.router.delete('/delete/:pix_key', this.controller.deletePixKey)
        this.router.get('/limits/:document', this.controller.getLimitsByDocument)
        this.router.get('/local_taxes/:document', this.controller.getLocalTaxesByDocument)
        this.router.patch('/limits/:document', this.controller.updatePixLimits)
        this.router.get('/limits_request/:document', this.controller.getPixLimitsRequest)
        this.router.get('/billing_compare', this.controller.billingKeysCompare)
        this.router.get('/billing_configuration/:document', this.controller.getBillingConfiguration)
        this.router.post('/bulk_billing_configuration/', this.controller.postBulkBillingConfiguration)
        //IMPORTANTE a qitech desabilitou a rota logo a função dessa rota abaixo PUT /billing_configuration/:document é alterada temporariamente para a rota de CRON
        this.router.put('/billing_configuration/:document', this.controller.updateBillingConfigurationRequest)
        this.router.put('/billing_configuration_cron/:document', this.controller.updateBillingConfigurationRequest)
        this.router.put('/default_billing_configuration/:document', this.controller.setDefaultBillingConfiguration)
        this.router.put('/all_billing_configuration/', this.controller.updateALLBillingConfiguration)
    }
}
