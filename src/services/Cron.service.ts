import { CronJob } from 'cron'
import { NotificationService } from './Notification.service'
import { runBillingJob } from '../jobs/billingJob'

export class CronService {
    public setup(): void {
        this.setupRetryNotificationsCron()
        this.setupDailyDataCollectionCron()
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
}
