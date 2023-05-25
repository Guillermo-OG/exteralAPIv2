import { CronJob } from 'cron'
import { NotificationService } from './Notification.service'

export class CronService {
    public setup(): void {
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
}
