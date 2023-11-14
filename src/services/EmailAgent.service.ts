import env from '../config/env'
import { createTransport, SendMailOptions, Transporter } from 'nodemailer'

export class EmailAgentService {
    private static instance: EmailAgentService
    private transporter: Transporter

    constructor() {
        const requiredEnvVars = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_AUTH_USER', 'MAIL_AUTH_PASS']
        const unsetEnvVars = requiredEnvVars.filter(envVar => !(envVar in env))

        if (unsetEnvVars.length > 0) {
            throw new Error(`Required email environment variables are missing: ${unsetEnvVars.join(', ')}`)
        }

        this.transporter = createTransport({
            host: env.MAIL_HOST,
            port: parseInt(env.MAIL_PORT, 10),
            secure: env.MAIL_PORT === '465', // true for 465, false for other ports
            auth: {
                user: env.MAIL_AUTH_USER,
                pass: env.MAIL_AUTH_PASS,
            },
        })
    }

    public static getInstance(): EmailAgentService {
        if (!EmailAgentService.instance) {
            EmailAgentService.instance = new EmailAgentService()
        }
        return EmailAgentService.instance
    }

    public async sendBillingReport(excelBuffer: Buffer, date: Date): Promise<void> {
        const formattedDate = date.toISOString().split('T')[0].replace(/-/g, '') // "YYYYMMDD"
        const fileName = `billing-${formattedDate}01.xlsx`

        const emailsFromEnv = env.MAIL_QITECH_BILLING.split(',').map(email => email.trim())
        const recipients = [...emailsFromEnv, 'guillermo@villelabrasillabs.com']

        const mailOptions: SendMailOptions = {
            from: env.MAIL_SENDER, // Sender address
            to: recipients, // List of recipients
            subject: fileName, // Subject line
            text: 'Attached is the daily billing report.', // Plain text body
            attachments: [
                {
                    filename: fileName,
                    content: excelBuffer,
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
            ],
        }

        const result = await this.transporter.sendMail(mailOptions)
        console.log(result)
    }
}
