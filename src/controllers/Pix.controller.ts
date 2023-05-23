import { NextFunction, Request, Response } from 'express'
import { PixRepository } from '../repository/Pix.repository'

export class PixController {
    public async listByDocument(req: Request, res: Response, next: NextFunction) {
        try {
            const document = req.query.document
            const keyType = req.query.pixKeyType

            const pixRepository = PixRepository.getInstance()

            const pixKeys = await pixRepository.listByDocument(document as string, keyType as string)

            res.json(pixKeys)
        } catch (error) {
            next(error)
        }
    }
}
