import { NextFunction, Request, Response } from 'express'
import { ValidationError } from 'yup'
import { PixKeyRepository } from '../repository/PixKey.repository'

export class PixController {
    public async listByDocument(req: Request, res: Response, next: NextFunction) {
        try {
            const document = req.query.document
            const keyType = req.query.pixKeyType

            if(!document) {
                throw new ValidationError('No document specified')
            }

            const pixRepository = PixKeyRepository.getInstance()
            const pixKeys = await pixRepository.listByDocument(document as string, keyType as string)

            res.json(pixKeys)
        } catch (error) {
            next(error)
        }
    }
}
