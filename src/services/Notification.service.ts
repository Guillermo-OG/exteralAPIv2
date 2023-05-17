import axios, { AxiosError, AxiosInstance } from 'axios'
import { addMinutes } from 'date-fns'
import { HydratedDocument } from 'mongoose'
import { INotification, NotificationStatus, NotificationType } from '../models'
import { NotificationRepository } from '../repository'

export class NotificationService {
    private static instance: NotificationService
    private readonly api: AxiosInstance

    private constructor() {
        this.api = axios.create()
    }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService()
        }
        return NotificationService.instance
    }

    public async create(payload: unknown, url: string): Promise<HydratedDocument<INotification>> {
        const notificationRepository = NotificationRepository.getInstance()
        const notification = await notificationRepository.create({
            attemps: 0,
            lastAttemp: null,
            nextAttemp: new Date(),
            payload: payload,
            type: NotificationType.WEBHOOK,
            status: NotificationStatus.PENDING,
            url: url,
        })

        return notification
    }

    public async notify(notification: HydratedDocument<INotification>): Promise<HydratedDocument<INotification>> {
        if (!notification.nextAttemp || (notification.lastAttemp && notification.nextAttemp && notification.nextAttemp > new Date())) {
            return notification
        }

        try {
            notification.lastAttemp = new Date()
            await notification.save()

            await this.api.post(notification.url, notification.payload)
            notification.status = NotificationStatus.SUCCESS
            notification.nextAttemp = null
        } catch (err) {
            let error: unknown
            if (err instanceof AxiosError) {
                error = {
                    name: err.name,
                    message: err.message,
                    detail: err.response?.data || err.cause,
                }
            } else if (err instanceof Error) {
                error = {
                    name: err.name,
                    message: err.message,
                }
            }

            notification.lastError = error
            notification.status = NotificationStatus.FAILED
            notification.attemps += 1
            if (notification.attemps === 5) {
                notification.nextAttemp = null
            } else {
                notification.nextAttemp = addMinutes(new Date(), 5)
            }
        }
        if (notification.isModified()) {
            await notification.save()
        }
        return notification
    }

    public async retryFailedNotifications(): Promise<void> {
        try {
            const notificationRepository = NotificationRepository.getInstance()
            let hasNextPage = true,
                page = 1

            do {
                const notifications = await notificationRepository.list(page, NotificationStatus.FAILED, true)
                const promises: Promise<unknown>[] = []
                for (const notification of notifications.data) {
                    promises.push(this.notify(notification))
                }
                await Promise.all(promises)

                page++
                hasNextPage = page <= notifications.totalPages
            } while (hasNextPage)
        } catch (error) {
            console.log(error)
        }
    }
}
