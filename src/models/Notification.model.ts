import { model, Schema } from 'mongoose'

export enum NotificationType {
    WEBHOOK = 'WEBHOOK',
}

export enum NotificationStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export interface INotification {
    type: NotificationType
    status: NotificationStatus
    url: string
    payload: unknown
    lastError?: unknown
    lastAttemp: Date | null
    nextAttemp: Date | null
    attemps: number
}

const schema = new Schema<INotification>(
    {
        type: { type: String, required: true },
        status: { type: String, required: true, default: NotificationStatus.PENDING },
        url: { type: String, required: true },
        payload: { type: Schema.Types.Mixed, required: true },
        lastError: { type: Schema.Types.Mixed, required: false },
        lastAttemp: { type: Date, required: false },
        nextAttemp: { type: Date, required: false },
        attemps: { type: Number, required: true },
    },
    {
        collection: 'notification',
        timestamps: true,
    }
)

export const Notification = model<INotification>('Notification', schema)
