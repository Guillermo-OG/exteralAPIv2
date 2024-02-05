/* eslint-disable @typescript-eslint/no-non-null-assertion */
export const serviceBusConfig = {
    connectionString: process.env.AZURE_SERVICE_BUS_CONNECTION_STRING!,
    queueName: process.env.AZURE_SERVICE_BUS_QUEUE_NAME!, // 'WebhooksQiTech_prod'
}
