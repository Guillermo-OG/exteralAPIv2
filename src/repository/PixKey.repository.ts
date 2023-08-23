import { FilterQuery } from 'mongoose'
import { unMask } from '../utils/masks'
import { paginatedSearch } from '../utils/pagination'
import { IPix, PixKey, PixModel } from '../models'

export class PixKeyRepository {
    private static instance: PixKeyRepository

    public static getInstance(): PixKeyRepository {
        if (!PixKeyRepository.instance) {
            PixKeyRepository.instance = new PixKeyRepository()
        }
        return PixKeyRepository.instance
    }

    public async create(data: IPix): Promise<PixModel> {
        return PixKey.create(data)
    }

    public async getByDocumentAndKeyType(document: string, keyType: string): Promise<PixModel | null> {
        return PixKey.findOne(
            {
                document: unMask(document),
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
        return PixKey.findOne(
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
            $eq: unMask(document),
        }

        return paginatedSearch(PixKey, {
            filter,
            page: 1,
        })
    }

    public listAllByDocument(document: string, keyType?: string): Promise<PixModel[]> {
        const filter: FilterQuery<IPix> = {
            document: {
                $eq: unMask(document),
            },
        }
        if (keyType) {
            filter.type = {
                $eq: keyType,
            }
        }

        return PixKey.find(filter).sort({ _id: -1 }).exec()
    }
}
