import { FilterQuery } from 'mongoose'
import { IPix, Pix, PixModel } from '../models/Pix.model'
import { paginatedSearch } from '../utils/pagination'

export class PixRepository {
    private static instance: PixRepository

    public static getInstance(): PixRepository {
        if (!PixRepository.instance) {
            PixRepository.instance = new PixRepository()
        }
        return PixRepository.instance
    }

    public async create(data: IPix): Promise<PixModel> {
        return Pix.create(data)
    }

    public async getByDocumentAndKeyType(document: string, keyType: string): Promise<PixModel | null> {
        return Pix.findOne(
            {
                document: document,
                type: keyType,
            },
            null,
            {
                sort: {
                    _id: -1,
                },
            }
        )
    }

    public getByRequestKey(requestKey: string): Promise<PixModel | null> {
        return Pix.findOne(
            {
                'response.pix_key_request_key': requestKey,
            },
            null,
            {
                sort: {
                    _id: -1,
                },
            }
        )
    }

    public listByDocument(document: string, keyType?: string) {
        const filter: FilterQuery<IPix> = {}
        if (keyType) {
            filter.type = {
                $eq: keyType,
            }
        }
        filter.document = {
            $eq: document,
        }

        return paginatedSearch(Pix, {
            filter,
            page: 1,
        })
    }
}
