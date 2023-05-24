import { NextFunction, Request, Response } from 'express'
import { AccountStatus, ValidationError } from '../models'
import { AccountRepository, FileRepository } from '../repository'
import { QiTechService } from '../services'
import { unMask } from '../utils/masks'

export class AccountController {
    public async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            const document = req.body.account_owner.individual_document_number || req.body.account_owner.company_document_number
            if (!document) {
                throw new ValidationError('Missing document')
            }

            const response = await qiTechService.createAccount(document, req.body)
            res.json(response)
        } catch (error) {
            next(await qiTechService.decodeError(error))
        }
    }

    public async getByDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const document = unMask(req.params.document)
            const account = await AccountRepository.getInstance().getByDocument(document)
            res.json(account)
        } catch (error) {
            next(error)
        }
    }

    public async List(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const page = Number(req.query.page ?? '1')
            const status = (req.query.status as AccountStatus) || undefined
            const document = (req.query.status as string) || undefined
            const accounts = AccountRepository.getInstance().list(page, document, status)

            res.json(accounts)
        } catch (error) {
            next(error)
        }
    }

    public async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            const { file, body } = req
            if (!file) {
                throw new ValidationError('File not found')
            }

            const fileModel = await qiTechService.uploadFile(unMask(body.document), body.type, file.originalname || 'file.pdf', file.buffer)

            res.json(fileModel)
        } catch (error) {
            next(await qiTechService.decodeError(error))
        }
    }

    public async listFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { page, document = '', type } = req.query

            const files = await FileRepository.getInstance().list(parseInt(page as string), unMask(document as string), type as string)

            res.json(files)
        } catch (error) {
            next(error)
        }
    }
}
