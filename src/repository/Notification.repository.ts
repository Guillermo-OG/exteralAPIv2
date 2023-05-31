import { subMinutes } from 'date-fns'
import { FilterQuery, HydratedDocument, ObjectId } from 'mongoose'
import { INotification, Notification, NotificationStatus } from '../models'
import { IPaginatedSearch, paginatedSearch } from '../utils/pagination'

export class NotificationRepository {
    private static instance: NotificationRepository

    public static getInstance(): NotificationRepository {
        if (!NotificationRepository.instance) {
            NotificationRepository.instance = new NotificationRepository()
        }
        return NotificationRepository.instance
    }

    public async create(data: INotification): Promise<HydratedDocument<INotification>> {
        return Notification.create(data)
    }

    public async getById(id: string | ObjectId): Promise<HydratedDocument<INotification> | null> {
        return Notification.findById(id.toString())
    }

    public async list(page: number, status?: NotificationStatus, retryable = false): Promise<IPaginatedSearch<INotification>> {
        const filter: FilterQuery<INotification> = {}
        if (status) {
            filter.status = {
                $eq: status,
            }
        }
        if (retryable) {
            filter.attemps = {
                $lt: 5,
            }
            filter.lastAttemp = {
                $lt: subMinutes(new Date(), 5),
            }
        }

        return paginatedSearch(Notification, {
            filter,
            page,
        })
    }
}
