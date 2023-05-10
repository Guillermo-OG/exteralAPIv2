import { FilterQuery, HydratedDocument, Model, ProjectionType, QueryOptions } from 'mongoose'

interface IPaginatedSearchConfig<T> {
    page?: number
    limitPerPage?: number
    filter?: FilterQuery<T>
    projection?: ProjectionType<T>
    options?: QueryOptions<T>
}

export interface IPaginatedSearch<T> {
    page: number
    count: number
    totalPages: number
    limitPerPage: number
    data: HydratedDocument<T>[]
}

export async function paginatedSearch<T>(model: Model<T>, config?: IPaginatedSearchConfig<T>): Promise<IPaginatedSearch<T>> {
    const limit = config?.limitPerPage ?? 50
    const page = config?.page || 1
    const skip = (page - 1) * limit

    const data = model
        .find(config?.filter ?? {}, config?.projection ?? null, config?.options ?? null)
        .limit(limit)
        .skip(skip)
        .sort({ _id: -1 })

    const totalCount = await model.count(config?.filter)
    return {
        page: page,
        limitPerPage: limit,
        count: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        data: await data,
    }
}
