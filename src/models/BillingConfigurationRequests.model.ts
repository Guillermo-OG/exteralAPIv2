import { model } from 'mongoose'
import { BillingConfigurationSchema, IBillingConfiguration } from './BillingConfiguration.model'

export interface IBillingConfigurationRequest extends IBillingConfiguration {
    account_number: string
    owner_person_type: string
}

const BillingConfigurationRequestsSchema = BillingConfigurationSchema.clone()

BillingConfigurationRequestsSchema.add({
    account_number: { type: String, required: true },
    owner_person_type: { type: String, required: true },
})

BillingConfigurationRequestsSchema.set('timestamps', true)

export const BillingConfigurationRequest = model<IBillingConfigurationRequest>(
    'BillingConfigurationRequest',
    BillingConfigurationRequestsSchema,
    'billing_configuration_requests'
)
