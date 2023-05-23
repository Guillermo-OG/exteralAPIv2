import { PixKeyType } from '../../../models/Pix.model'

export interface IWebhookPix {
    pix_key: string
    account_key: string
    webhook_type: string
    pix_key_status: string
    pix_key_request_key: string
    pix_key_request_type: string
    pix_key_request_status: string
}

export enum IPixKeyStatus {
    'PENDING' = 'pending',
    'SUCCESS' = 'approved'
}

export interface ICreatePix {
    account_key: string
    pix_key_type: PixKeyType
    pix_key?: string
}

