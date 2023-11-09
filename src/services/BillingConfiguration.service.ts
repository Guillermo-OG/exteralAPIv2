import { BillingConfigurationRequestRepository } from '../repository'
import { IBillingConfigurationRequest } from '../models/BillingConfigurationRequests.model'
import { HydratedDocument } from 'mongoose'

export class BillingConfigurationRequestService {
    private static instance: BillingConfigurationRequestService
    private readonly billingConfigurationRequestRepository: BillingConfigurationRequestRepository

    private constructor() {
        this.billingConfigurationRequestRepository = BillingConfigurationRequestRepository.getInstance()
    }

    public static getInstance(): BillingConfigurationRequestService {
        if (!BillingConfigurationRequestService.instance) {
            BillingConfigurationRequestService.instance = new BillingConfigurationRequestService()
        }
        return BillingConfigurationRequestService.instance
    }

    public async getRecentUpdates(): Promise<HydratedDocument<IBillingConfigurationRequest>[]> {
        return this.billingConfigurationRequestRepository.findUpdatedWithinLastDay()
    }
}
