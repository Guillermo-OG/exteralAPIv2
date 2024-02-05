import './utils/validations/yupConfig'
import * as appInsights from 'applicationinsights'
import express, { Express } from 'express'
import Database from './config/database'
import env from './config/env'
import { ErrorMiddleware, AppInsightsMiddleware, ProtectHeaderMiddleware } from './middleware'
import { AccountRouter, HealthRouter, OnboardingRouter, PersonRouter, PixKeyRouter, WebhookRouter } from './routes'
import { CronService } from './services'
import { TelemetryClient } from 'applicationinsights'

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
        // Configure Application Insights
        appInsights
            .setup(env.INSIGHTS_CONNECTION_STRING)
            .setAutoDependencyCorrelation(true)
            .setAutoCollectRequests(false)
            .setAutoCollectPerformance(true)
            .setAutoCollectExceptions(true)
            .setAutoCollectDependencies(false)
            .setAutoCollectConsole(true, true)
            .start()

        // Initialize Application Insights Client
        this.app.locals.appInsightsClient = new TelemetryClient(env.INSIGHTS_CONNECTION_STRING)

        //loga todas as request no app insights
        this.app.use(new AppInsightsMiddleware().handler)

        await Database.getInstance().start()
        new CronService().setup()
        this.app.use(new ProtectHeaderMiddleware().handler)
        this.app.use(express.text())
        this.app.use(express.json())
        this.routes()
        console.log(env)
    }

    private routes(): void {
        this.app.use('/health', new HealthRouter().router)
        this.app.use('/account', new AccountRouter().router)
        this.app.use('/onboarding', new OnboardingRouter().router)
        this.app.use('/webhook', new WebhookRouter().router)
        this.app.use('/pix-key', new PixKeyRouter().router)
        this.app.use('/person', new PersonRouter().router)
        this.app.use(new ErrorMiddleware().handler)
    }
}

export default new Server()
