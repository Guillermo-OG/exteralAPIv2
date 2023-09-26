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

    public async get(document: string): Promise<HydratedDocument<IBillingConfiguration> | null> {
        return await BillingConfiguration.findOne({ document })
    }

    public async update(data: Partial<IBillingConfiguration>): Promise<void> {
        await BillingConfiguration.updateOne({}, data, { upsert: true })
    }

    public async insert(data: IBillingConfiguration): Promise<void> {
        const newBillingConfiguration = new BillingConfiguration(data)
        await newBillingConfiguration.save()
    }

    public async updateByDocument(document: string, data: Partial<IBillingConfiguration>): Promise<void> {
        await BillingConfiguration.updateOne({ document }, data, { upsert: true })
    }

    public async upsertByDocument(document: string, data: IBillingConfiguration): Promise<void> {
        await BillingConfiguration.updateOne({ document }, data, { upsert: true });
      }
}
