import { HydratedDocument } from 'mongoose'
import { BillingConfiguration, IBillingConfiguration } from '../models/BillingConfiguration.model'

export class BillingConfigurationRepository {
    private static instance: BillingConfigurationRepository

    public static getInstance(): BillingConfigurationRepository {
        if (!BillingConfigurationRepository.instance) {
            BillingConfigurationRepository.instance = new BillingConfigurationRepository()
        }
        return BillingConfigurationRepository.instance
    }

    public async get(): Promise<HydratedDocument<IBillingConfiguration> | null> {
        return await BillingConfiguration.findOne()
    }

    public async update(data: Partial<IBillingConfiguration>): Promise<void> {
        await BillingConfiguration.updateOne({}, data, { upsert: true })
    }
}
