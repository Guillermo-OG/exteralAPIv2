/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as dotenv from 'dotenv'
dotenv.config()
const env = {
    MONGO_URL: process.env.MONGO_URL!,
    SERVER_PORT: process.env.SERVER_PORT!,
    INSIGHTS_CONNECTION_STRING: process.env.INSIGHTS_CONNECTION_STRING!,
    DATABASE_NAME: process.env.DATABASE_NAME!,
    ONBOARDING_BASE_URL: process.env.ONBOARDING_BASE_URL!,
    ONBOARDING_API_SECRET: process.env.ONBOARDING_API_SECRET!,
    ONBOARDING_WEBHOOK_SECRET: process.env.ONBOARDING_WEBHOOK_SECRET!,
    QITECH_BASE_URL: process.env.QITECH_BASE_URL!,
    QITECH_API_KEY: process.env.QITECH_API_KEY!,
    QITECH_WEBHOOK_SECRET: process.env.QITECH_WEBHOOK_SECRET!,
    QITECH_PRIVATE_KEY: process.env.QITECH_PRIVATE_KEY!,
    QITECH_PRIVATE_KEY_PASSPHRASE: process.env.QITECH_PRIVATE_KEY_PASSPHRASE!,
    QITECH_PUBLIC_KEY: process.env.QITECH_PUBLIC_KEY!,
    BILLING_ACCOUNT_KEY: process.env.BILLING_ACCOUNT_KEY || 'user',
    MAIL_HOST: process.env.MAIL_HOST!,
    MAIL_PORT: process.env.MAIL_PORT!,
    MAIL_AUTH_USER: process.env.MAIL_AUTH_USER!,
    MAIL_AUTH_PASS: process.env.MAIL_AUTH_PASS!,
    MAIL_SENDER: process.env.MAIL_SENDER!,
    MAIL_QITECH_BILLING: process.env.MAIL_QITECH_BILLING!,
    ONBOARDING_WEBHOOK_URL_CONTA_VBB: process.env.ONBOARDING_WEBHOOK_URL_CONTA_VBB!,
    VBB_API_USER_ID: process.env.VBB_API_USER_ID!,
}

export default env
