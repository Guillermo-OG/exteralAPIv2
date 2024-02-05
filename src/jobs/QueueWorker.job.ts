import { QueueService } from '../services/Queue.service'
import { OnboardingService, QiTechService, NotificationService } from '../services'
import { OnboardingTypes } from '../infra'
import { IApiUser } from '../models'
import { HydratedDocument } from 'mongoose'
import { ISignedResponse, IWebhookData } from '../infra/qitech/types/Common.types'

export class QueueWorker {
    private queueService: QueueService = QueueService.getInstance()

    public async processQueue(): Promise<void> {
        const messages = await this.queueService.receiveMessages()

        // Como agora só vem uma mensagem por vez, você pode simplificar a lógica
        if (messages.length > 0) {
            const message = messages[0] // Como agora é só uma mensagem, pega a primeira
            try {
                switch (message.body.type) {
                    case 'onboarding':
                        await this.processOnboardingWebhook(message.body.data, message.body.user)
                        break
                    case 'accountCreation':
                        await this.processAccountCreation(message.body.data)
                        break
                    case 'qiTechBaaS':
                        await this.processQITechBaaSWebhook(message.body.data, message.body.headers)
                        break
                    default:
                        console.error('Unknown message type:', message.body.type)
                }
            } catch (error) {
                console.error('Error processando webhook:', error)
            } finally {
                await this.queueService.completeMessage(message)
                const completionTime = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                console.log(`Mensagem completada às ${completionTime}`)
            }
        } else {
            // Nenhuma mensagem para processar nesta iteração.
        }
    }

    private async processOnboardingWebhook(data: OnboardingTypes.IWebhookBody, user: HydratedDocument<IApiUser>): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            const service = OnboardingService.getInstance()
            const notificationService = NotificationService.getInstance()

            const { payload, url, createdAccount } = await service.handleWebhook(data)

            // Use o usuário extraído da mensagem ao invés de buscar do env ou criar um novo
            const notification = await notificationService.create(payload, url, user)
            await notificationService.notify(notification)

            console.log('webhook response', { url, payload, createdAccount })
        } catch (error) {
            console.error(await qiTechService.decodeError(error))
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async processAccountCreation(_data: object): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            await QiTechService.getInstance().handleAccountCreation()
        } catch (error) {
            console.error(await qiTechService.decodeError(error))
        }
    }

    private async processQITechBaaSWebhook(
        data: ISignedResponse,
        headers: { [key: string]: string | string[] | undefined }
    ): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            const webhookData: IWebhookData = {
                body: data,
                headers: headers,
            }

            await QiTechService.getInstance().handleWebhook(webhookData)
        } catch (error) {
            console.error(await qiTechService.decodeError(error))
        }
    }

    private async testCRONWebhook(data: ISignedResponse, headers: { [key: string]: string | string[] | undefined }): Promise<void> {
        // const qiTechService = QiTechService.getInstance()
        try {
            const webhookData: IWebhookData = {
                body: data,
                headers: headers,
            }

            await QiTechService.getInstance().handleWebhookTEST(webhookData)
        } catch (error) {
            // console.error(await qiTechService.decodeError(error))
            throw error
        }
    }
}
