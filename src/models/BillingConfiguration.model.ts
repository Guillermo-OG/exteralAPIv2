import { model, Schema } from 'mongoose'

const FeeSchema = new Schema(
    {
        amount: { type: Number, required: true },
        expense_type: { type: String, enum: ['absolute_value', 'percentage'], required: true },
    },
    { _id: false }
)

const BankslipFeesSchema = new Schema(
    {
        registration: FeeSchema,
        permanence: FeeSchema,
        protest_removal: FeeSchema,
        protest_request: FeeSchema,
        protest_costs: FeeSchema,
        expiration_date_change: FeeSchema,
        rebate_inclusion: FeeSchema,
        discount_inclusion: FeeSchema,
        notary_office_payment: FeeSchema,
        expiration_write_off: FeeSchema,
        write_off: FeeSchema,
        protest_write_off: FeeSchema,
        protest_removal_and_write_off: FeeSchema,
        payment: FeeSchema,
        fine_or_interest_inclusion: FeeSchema,
    },
    { _id: false }
)

const TedFeesSchema = new Schema(
    {
        outgoing_ted: FeeSchema,
        incoming_ted: FeeSchema,
    },
    { _id: false }
)

const PixFeesSchema = new Schema(
    {
        incoming_pix_manual: FeeSchema,
        outgoing_pix_manual: FeeSchema,
        incoming_pix_key: FeeSchema,
        outgoing_pix_key: FeeSchema,
        incoming_pix_static_qr_code: FeeSchema,
        outgoing_pix_static_qr_code: FeeSchema,
        incoming_pix_dynamic_qr_code: FeeSchema,
        outgoing_pix_dynamic_qr_code: FeeSchema,
        incoming_pix_chargeback: FeeSchema,
        outgoing_pix_chargeback: FeeSchema,
        incoming_pix_external_service: FeeSchema,
        outgoing_pix_external_service: FeeSchema,
    },
    { _id: false }
)

const BankslipSchema = new Schema(
    {
        bankslip_fees: BankslipFeesSchema,
        billing_account_key: { type: String, required: true },
    },
    { _id: false }
)

const TedSchema = new Schema(
    {
        ted_fees: TedFeesSchema,
        billing_account_key: { type: String, required: true },
    },
    { _id: false }
)

const PixSchema = new Schema(
    {
        pix_fees: PixFeesSchema,
        billing_account_key: { type: String, required: true },
    },
    { _id: false }
)

const AccountMaintenanceSchema = new Schema(
    {
        amount: { type: Number, required: true },
        billing_account_key: { type: String, required: true },
    },
    { _id: false }
)

export const BillingConfigurationSchema = new Schema({
    document: {
        type: String,
        required: true,
    },
    billing_configuration_data: {
        bankslip: BankslipSchema,
        ted: TedSchema,
        pix: PixSchema,
        account_maintenance: AccountMaintenanceSchema,
    },
})

interface IFee {
    amount: number
    expense_type: 'absolute_value' | 'percentage'
}

interface IBankslipFees {
    registration: IFee
    permanence: IFee
    protest_removal: IFee
    protest_request: IFee
    protest_costs: IFee
    expiration_date_change: IFee
    rebate_inclusion: IFee
    discount_inclusion: IFee
    notary_office_payment: IFee
    expiration_write_off: IFee
    write_off: IFee
    protest_write_off: IFee
    protest_removal_and_write_off: IFee
    payment: IFee
    fine_or_interest_inclusion: IFee
}

interface ITedFees {
    outgoing_ted: IFee
    incoming_ted: IFee
}

interface IPixFees {
    incoming_pix_manual?: IFee
    outgoing_pix_manual?: IFee
    incoming_pix_key?: IFee
    outgoing_pix_key?: IFee
    incoming_pix_static_qr_code?: IFee
    outgoing_pix_static_qr_code?: IFee
    incoming_pix_dynamic_qr_code?: IFee
    outgoing_pix_dynamic_qr_code?: IFee
    incoming_pix_chargeback?: IFee
    outgoing_pix_chargeback?: IFee
    incoming_pix_external_service?: IFee
    outgoing_pix_external_service?: IFee
}

interface IBankslip {
    bankslip_fees: IBankslipFees
    billing_account_key: string
}

interface ITed {
    ted_fees: ITedFees
    billing_account_key: string
}

interface IPix {
    pix_fees: IPixFees
    billing_account_key: string
}

interface IAccountMaintenance {
    amount: number
    billing_account_key: string
}

export interface IBillingConfigurationData {
    bankslip: IBankslip
    ted: ITed
    pix: IPix
    account_maintenance: IAccountMaintenance
}

export interface IBillingConfiguration {
    document: string
    billing_configuration_data: IBillingConfigurationData
}

export const BillingConfiguration = model('BillingConfiguration', BillingConfigurationSchema, 'billing_configuration_data')
