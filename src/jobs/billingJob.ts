import { EmailAgentService } from '../services'
import { BillingConfigurationRequestService } from '../services'
import { createExcelFromData } from '../utils/excelBillingData.util'

async function runBillingJob() {
    try {
        const billingService = BillingConfigurationRequestService.getInstance()
        const formattedData = await billingService.getRecentUpdates()
        const excelBuffer = await createExcelFromData(formattedData)

        const emailService = EmailAgentService.getInstance()
        const date = new Date() // Ou a data que representa "hoje" para o seu relatório
        await emailService.sendBillingReport(excelBuffer, date)
        console.log('Billing job completed successfully.')
    } catch (error) {
        console.error('An error occurred during the billing job:', error)
    }
}

export { runBillingJob }
