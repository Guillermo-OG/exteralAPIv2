import * as appInsights from 'applicationinsights'
import express, { Express } from 'express'
import Database from './config/database'
import env from './config/env'
import { ErrorMiddleware } from './middleware'
import { AccountRouter, HealthRouter, OnboardingRouter, PixKeyRouter, WebhookRouter } from './routes'
import { CronService } from './services'

class Server {
    private app: Express
    private port: number

    constructor() {
        this.app = express()
        this.port = parseInt(env.SERVER_PORT)
    }

    public async start(): Promise<void> {
        await this.config()
        this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`)
        })
    }

    private async config(): Promise<void> {
        await Database.getInstance().start()
        new CronService().setup()

        this.app.use(express.text())
        this.app.use(express.json())
        this.routes()
        console.log(env)
        appInsights.setup(env.INSIGHTS_CONNECTION_STRING).setAutoCollectConsole(true, true).start()
    }

    private routes(): void {
        this.app.use('/health', new HealthRouter().router)

        this.app.use('/account', new AccountRouter().router)
        this.app.use('/onboarding', new OnboardingRouter().router)
        this.app.use('/webhook', new WebhookRouter().router)
        this.app.use('/pix-key', new PixKeyRouter().router)
        this.app.use(new ErrorMiddleware().handler)
    }
}

export default new Server()
