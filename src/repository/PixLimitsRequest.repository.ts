import { HydratedDocument } from 'mongoose'
import { PixLimitsRequest, IPixLimitsRequest } from '../models'

export class PixLimitsRequestRepository {
    private static instance: PixLimitsRequestRepository

    public static getInstance(): PixLimitsRequestRepository {
        if (!PixLimitsRequestRepository.instance) {
            PixLimitsRequestRepository.instance = new PixLimitsRequestRepository()
        }
        return PixLimitsRequestRepository.instance
    }

    public async create(data: IPixLimitsRequest): Promise<HydratedDocument<IPixLimitsRequest>> {
        const newBillingConfiguration = new PixLimitsRequest(data)
        return await newBillingConfiguration.save()
    }

    public async update(document: string, data: Partial<IPixLimitsRequest>): Promise<void> {
        await PixLimitsRequest.updateOne({ document }, { $set: data })
    }
}
