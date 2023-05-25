import { FilterQuery, HydratedDocument, ObjectId } from 'mongoose'
import { Account, AccountStatus, IAccount } from '../models'
import { IPaginatedSearch, paginatedSearch } from '../utils/pagination'

export class AccountRepository {
    private static instance: AccountRepository

    public static getInstance(): AccountRepository {
        if (!AccountRepository.instance) {
            AccountRepository.instance = new AccountRepository()
        }
        return AccountRepository.instance
    }

    public async create(data: IAccount): Promise<HydratedDocument<IAccount>> {
        return await Account.create(data)
    }

    public async getById(id: ObjectId | string): Promise<HydratedDocument<IAccount> | null> {
        return await Account.findById(id)
    }

    public async getByRequestKey(key: string): Promise<HydratedDocument<IAccount> | null> {
        return Account.findOne(
            {
                'response.key': key,
            },
            null,
            {
                sort: {
                    _id: -1,
                },
            }
        )
    }

    public async getByAccountKey(key: string): Promise<HydratedDocument<IAccount> | null> {
        return Account.findOne(
            {
                'data.account_key': key,
            },
            null,
            {
                sort: {
                    _id: -1,
                },
            }
        )
    }

    public async getByDocument(document: string): Promise<HydratedDocument<IAccount> | null> {
        const where: FilterQuery<IAccount> = {
            document,
        }
        const accounts = await Account.aggregate<HydratedDocument<IAccount>>([
            {
                $lookup: {
                    as: 'pixKeys',
                    from: 'pix_key',
                    localField: '_id',
                    foreignField: 'accountId',
                },
            },
            {
                $match: where,
            },
        ]).exec()
        return accounts[0]
    }

    public async list(page: number, document?: string, status?: AccountStatus): Promise<IPaginatedSearch<IAccount>> {
        const filter: FilterQuery<IAccount> = {}
        if (document) {
            filter.document = {
                $eq: document,
            }
        }
        if (status) {
            filter.status = {
                $eq: status,
            }
        }

        return paginatedSearch(Account, {
            filter,
            page,
        })
    }
}
