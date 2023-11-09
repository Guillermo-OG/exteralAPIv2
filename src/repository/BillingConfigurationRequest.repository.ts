import { HydratedDocument } from 'mongoose'
import { BillingConfigurationRequest, IBillingConfigurationRequest } from '../models/BillingConfigurationRequests.model'

export class BillingConfigurationRequestRepository {
    private static instance: BillingConfigurationRequestRepository

    public static getInstance(): BillingConfigurationRequestRepository {
        if (!BillingConfigurationRequestRepository.instance) {
            BillingConfigurationRequestRepository.instance = new BillingConfigurationRequestRepository()
        }
        return BillingConfigurationRequestRepository.instance
    }

    public async upsertByAccountNumber(accountNumber: string, data: IBillingConfigurationRequest): Promise<void> {
        await BillingConfigurationRequest.updateOne({ account_number: accountNumber }, data, { upsert: true })
    }

    public async findUpdatedWithinLastDay(): Promise<HydratedDocument<IBillingConfigurationRequest>[]> {
        const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000)
        return BillingConfigurationRequest.find({ updatedAt: { $gte: oneDayAgo } })
    }
}
