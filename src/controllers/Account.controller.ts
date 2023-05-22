import { NextFunction, Request, Response } from 'express'
import { ValidationError } from '../models'
import { QiTechService } from '../services'
import { FileRepository } from '../repository'
import { unMask } from '../utils/masks'

export class AccountController {
    public async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const response = await QiTechService.getInstance().createAccount(req.body.account_owner.individual_document_number, req.body)
            res.json(response)
        } catch (error) {
            next(error)
        }
    }

    public async getByDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const document = unMask(req.params.document)
            const account = await QiTechService.getInstance().getAndUpdateAccount(document)
            res.send('ola')
        } catch (error) {
            next(error)
        }
    }

    public async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { file, body } = req
            if (!file) {
                throw new ValidationError('File not found')
            }

            const fileModel = await QiTechService.getInstance().uploadFile(
                unMask(body.document),
                body.type,
                file.originalname || 'file.pdf',
                file.buffer
            )

            res.json(fileModel)
        } catch (error) {
            next(error)
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
