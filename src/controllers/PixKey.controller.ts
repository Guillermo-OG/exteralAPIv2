import { NextFunction, Request, Response } from 'express'
import { ValidationError } from 'yup'
import { PixKeyRepository } from '../repository'
import { QiTechTypes } from '../infra'
import { QiTechService } from '../services'

export class PixKeyController {
    public async listByDocument(req: Request, res: Response, next: NextFunction) {
        try {
            const document = req.query.document
            const keyType = req.query.pixKeyType

            if (!document) {
                throw new ValidationError('No document specified')
            }

            const pixRepository = PixKeyRepository.getInstance()
            const pixKeys = await pixRepository.listByDocument(document as string, keyType as string)

            res.json(pixKeys)
        } catch (error) {
            next(error)
        }
    }

    public async createPixKey(req: Request, res: Response, next: NextFunction) {
        try {
            const qiTechService = QiTechService.getInstance()

            const payload: QiTechTypes.Pix.ICreatePix = req.body // A partir do corpo da solicitação

            const pixKey = await qiTechService.createPixKey(payload)

            res.json(pixKey)
        } catch (error) {
            next(error)
        }
    }
}
