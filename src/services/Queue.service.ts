/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServiceBusClient, ServiceBusReceivedMessage } from '@azure/service-bus'
import { serviceBusConfig } from '../config/serviceBusConfig'

export class QueueService {
    private static instance: QueueService
    private client: ServiceBusClient
    private sender
    private receiver
    private receiving: boolean = false // Flag para controlar o estado de recebimento

    constructor() {
        this.client = new ServiceBusClient(serviceBusConfig.connectionString)
        this.sender = this.client.createSender(serviceBusConfig.queueName)
        this.receiver = this.client.createReceiver(serviceBusConfig.queueName)
    }

    public static getInstance(): QueueService {
        if (!QueueService.instance) {
            QueueService.instance = new QueueService()
        }
        return QueueService.instance
    }

    async sendMessage(message: any) {
        await this.sender.sendMessages({ body: message })
    }

    async receiveMessages() {
        if (this.receiving) {
            console.log('Já está recebendo mensagens, operação ignorada.')
            return [] // Retorna imediatamente para evitar sobreposição
        }

        this.receiving = true // Marca que o recebimento começou
        try {
            // Alterado para receber apenas uma mensagem por vez
            const receivedMessages = await this.receiver.receiveMessages(1, { maxWaitTimeInMs: 5000 })
            return receivedMessages
        } finally {
            this.receiving = false // Garante que o flag seja resetado após receber as mensagens
        }
    }

    async completeMessage(message: ServiceBusReceivedMessage) {
        await this.receiver.completeMessage(message)
    }
}
