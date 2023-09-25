interface IFee {
    amount: number
    expense_type: 'absolute_value' | 'percentage'
}

interface ITedFees {
    outgoing_ted: IFee
    incoming_ted: IFee
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

interface IPixFees {
    incoming_pix_manual: IFee
    outgoing_pix_manual: IFee
    incoming_pix_key: IFee
    outgoing_pix_key: IFee
    incoming_pix_static_qr_code: IFee
    outgoing_pix_static_qr_code: IFee
    incoming_pix_dynamic_qr_code: IFee
    outgoing_pix_dynamic_qr_code: IFee
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

export interface IBillingConfigurationResponse {
    billing_configuration_data: {
        bankslip: IBankslip
        ted: ITed
        pix: IPix
        account_maintenance: IAccountMaintenance
    }
}
