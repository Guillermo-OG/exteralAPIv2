/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as dotenv from 'dotenv'
dotenv.config()
const env = {
    MONGO_URL: process.env.MONGO_URL!,
    SERVER_PORT: process.env.SERVER_PORT!,
    DATABASE_NAME: process.env.DATABASE_NAME!,
    QI_TECH_BASE_URL: process.env.QI_TECH_BASE_URL!,
    QI_TECH_API_SECRET: process.env.QI_TECH_API_SECRET!,
}

export default env
