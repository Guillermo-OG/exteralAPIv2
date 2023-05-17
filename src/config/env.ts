/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as dotenv from 'dotenv'
dotenv.config()
const env = {
    MONGO_URL: process.env.MONGO_URL!,
    SERVER_PORT: process.env.SERVER_PORT!,
    DATABASE_NAME: process.env.DATABASE_NAME!,
    ONBOARDING_BASE_URL: process.env.ONBOARDING_BASE_URL!,
    ONBOARDING_API_SECRET: process.env.ONBOARDING_API_SECRET!,
    ONBOARDING_WEBHOOK_SECRET: process.env.ONBOARDING_WEBHOOK_SECRET!,
}

export default env
