import Excel from 'exceljs'
import { Buffer } from 'buffer'
import { IBillingConfigurationRequest } from '../models'

async function createExcelFromData(data: IBillingConfigurationRequest[]): Promise<Buffer> {
    const workbook = new Excel.Workbook()
    const sheet = workbook.addWorksheet('Planilha1')

    interface IFee {
        amount: number
        expense_type: 'absolute_value' | 'percentage'
    }

    // Adiciona o cabeçalho da planilha com os nomes fornecidos
    sheet.addRow([
        'account_number',
        'owner_person_type',
        'billing_account',
        'incoming_pix_manual',
        'incoming_pix_key',
        'incoming_pix_static_qr_code',
        'incoming_pix_dynamic_qr_code',
        'outgoing_pix_manual',
        'outgoing_pix_key',
        'outgoing_pix_static_qr_code',
        'outgoing_pix_dynamic_qr_code',
        'bank_slip_registration',
        'bank_slip_permanence',
        'bank_slip_protest_removal',
        'bank_slip_protest_request',
        'bank_slip_protest_costs',
        'bank_slip_expiration_date_change',
        'bank_slip_rebate_inclusion',
        'bank_slip_discount_inclusion',
        'bank_slip_notary_office_payment',
        'bank_slip_expiration_write_off',
        'bank_slip_write_off',
        'bank_slip_protest_write_off',
        'bank_slip_protest_removal_and_write_off',
        'bank_slip_payment',
        'bank_slip_fine_or_interest_inclusion',
        'outgoing_ted',
        'incoming_ted',
        'account_maintenance',
    ])

    // Função auxiliar para formatar o valor da tarifa conforme as regras
    function formatFee(fee: IFee | undefined): string {
        if (!fee || fee.amount === 0) return '0.00' // Se o fee não estiver presente ou for 0, retorna "0.00"
        return `${fee.expense_type === 'percentage' ? 'P' : 'F'}${fee.amount.toFixed(2)}`
    }

    // Adiciona as linhas com os dados
    data.forEach(obj => {
        try {
            const fees = obj.billing_configuration_data
            const pixFees = fees?.pix?.pix_fees
            const bankslipFees = fees?.bankslip?.bankslip_fees
            const tedFees = fees?.ted?.ted_fees

            const rowData = [
                obj.account_number,
                obj.owner_person_type,
                'owner', // billing_account é sempre "owner"
                formatFee(pixFees?.incoming_pix_manual),
                formatFee(pixFees?.incoming_pix_key),
                formatFee(pixFees?.incoming_pix_static_qr_code),
                formatFee(pixFees?.incoming_pix_dynamic_qr_code),
                formatFee(pixFees?.outgoing_pix_manual),
                formatFee(pixFees?.outgoing_pix_key),
                formatFee(pixFees?.outgoing_pix_static_qr_code),
                formatFee(pixFees?.outgoing_pix_dynamic_qr_code),
                formatFee(bankslipFees?.registration),
                formatFee(bankslipFees?.permanence),
                formatFee(bankslipFees?.protest_removal),
                formatFee(bankslipFees?.protest_request),
                formatFee(bankslipFees?.protest_costs),
                formatFee(bankslipFees?.expiration_date_change),
                formatFee(bankslipFees?.rebate_inclusion),
                formatFee(bankslipFees?.discount_inclusion),
                formatFee(bankslipFees?.notary_office_payment),
                formatFee(bankslipFees?.expiration_write_off),
                formatFee(bankslipFees?.write_off),
                formatFee(bankslipFees?.protest_write_off),
                formatFee(bankslipFees?.protest_removal_and_write_off),
                formatFee(bankslipFees?.payment),
                formatFee(bankslipFees?.fine_or_interest_inclusion),
                formatFee(tedFees?.outgoing_ted),
                formatFee(tedFees?.incoming_ted),
                formatFee(
                    fees?.account_maintenance ? { amount: fees.account_maintenance.amount, expense_type: 'absolute_value' } : undefined
                ),
            ]
            sheet.addRow(rowData)
        } catch (error) {
            console.error('Error alterando as taxas da seguinte conta:', obj.account_number, ':', error)
        }
    })

    // Escreve o workbook em um buffer e retorna
    return workbook.xlsx.writeBuffer() as Promise<Buffer>
}

export { createExcelFromData }
