import { CronJob } from 'cron'
import { NotificationService } from './Notification.service'
import { runBillingJob } from '../jobs/billingJob'
import { QueueWorker } from '../jobs/QueueWorker.job'

export class CronService {
    private queueWorker: QueueWorker = new QueueWorker()

    public setup(): void {
        this.setupRetryNotificationsCron()
        this.setupDailyDataCollectionCron()
        this.setupQueueProcessingCron()
    }

    private setupRetryNotificationsCron(): void {
        new CronJob(
            '0 * * * * *',
            () => {
                NotificationService.getInstance().retryFailedNotifications()
            },
            null,
            true,
            'America/Sao_Paulo'
        )
    }

    private setupDailyDataCollectionCron(): void {
        new CronJob(
            '0 0 2 * * *',
            async () => {
                try {
                    await runBillingJob()
                } catch (error) {
                    console.error('Failed to execute daily data collection task', error)
                }
            },
            null,
            true,
            'America/Sao_Paulo'
        )
    }

    private setupQueueProcessingCron(): void {
        // Este cron job roda a cada 10 segundos
        new CronJob(
            '*/10 * * * * *', // Executa a cada 10 segundos
            async () => {
                try {
                    await this.queueWorker.processQueue()
                } catch (error) {
                    console.error('Failed to process queue', error)
                }
            },
            null,
            true,
            'America/Sao_Paulo'
        )
    }
}
