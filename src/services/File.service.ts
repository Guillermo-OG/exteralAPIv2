import { HydratedDocument } from 'mongoose'
import { IFile } from '../models'
import { FileRepository } from '../repository'

export class FileService {
    private static instance: FileService
    private readonly fileRepository: FileRepository

    constructor() {
        this.fileRepository = FileRepository.getInstance()
    }

    public static getInstance(): FileService {
        if (!FileService.instance) {
            FileService.instance = new FileService()
        }
        return FileService.instance
    }

    public async create(data: IFile): Promise<HydratedDocument<IFile>> {
        return await this.fileRepository.create(data)
    }
}
