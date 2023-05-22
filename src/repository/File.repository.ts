import { FilterQuery, HydratedDocument } from 'mongoose'
import { File, IFile } from '../models'
import { IPaginatedSearch, paginatedSearch } from '../utils/pagination'

export class FileRepository {
    private static instance: FileRepository

    public static getInstance(): FileRepository {
        if (!FileRepository.instance) {
            FileRepository.instance = new FileRepository()
        }
        return FileRepository.instance
    }

    public async create(data: IFile): Promise<HydratedDocument<IFile>> {
        return await File.create(data)
    }

    public async findOne(document: string, type: string): Promise<HydratedDocument<IFile> | null> {
        return await File.findOne({ document, type })
    }

    public async list(page: number, document?: string, type?: string): Promise<IPaginatedSearch<IFile>> {
        const filter: FilterQuery<IFile> = {}
        if (document) {
            filter.document = {
                $eq: document,
            }
        }
        if (type) {
            filter.type = {
                $eq: type,
            }
        }

        return paginatedSearch(File, {
            filter,
            page,
        })
    }
}
