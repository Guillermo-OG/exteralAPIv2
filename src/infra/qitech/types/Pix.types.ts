import { PixKeyType } from '../../../models/PixKey.model'

export interface IPixKeyWebhook {
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
    'SUCCESS' = 'approved',
}

export interface ICreatePix {
    account_key: string
    pix_key_type: PixKeyType
    pix_key?: string
}

export interface IPixLimits {
    daily_amount_limit: string
    daily_amount_percentage: string | null
    daily_amount_used: string
    nightly_amount_limit: string
    nightly_amount_percentage: string | null
    nightly_amount_used: string
    self_daily_amount_limit: string
    self_daily_amount_percentage: string | null
    self_daily_amount_used: string
    self_nightly_amount_limit: string
    self_nightly_amount_percentage: string | null
    self_nightly_amount_used: string
}

export interface IPixLimitUpdateRequest {
    account_key: string
    amount_limit: number
    created_at: string
    limit_type: string
    request_key: string
    request_status: IPixRequestStatus
    routine_key: string | null
}

export enum IPixRequestStatus {
    PENDING_APPROVAL = 'pending_approval',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    EXECUTED = 'executed',
    ALL = 'pending_approval,approved,rejected,executed',
}

export interface IPixTransferLimitConfig {
    period: string,
    account_key: string,
    amount_limit: number,
    self_amount_limit: number
}

export interface IPixLimitRequestWebhook {
    webhook_type: string
    origin_key: string
    data: IDataPixLimit
}

export interface IDataPixLimit {
    pix_transfer_limit_config: IPixTransferLimitConfig[];
}
