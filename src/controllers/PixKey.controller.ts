import { NextFunction, Request, Response } from 'express'
import { ValidationError } from 'yup'
import { PixKeyRepository } from '../repository'
import { QiTechTypes } from '../infra'
import { QiTechService } from '../services'
import { unMask } from '../utils/masks'

export class PixKeyController {
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

    public async getLimitsByDocument(req: Request, res: Response, next: NextFunction) {
        try {
            const document = unMask(req.params.document)
            if (!document) {
                throw new ValidationError('No document specified')
            }
            const qiTechService = QiTechService.getInstance()
            const limits = await qiTechService.getPixLimitsByDocument(document as string)
            res.json(limits)
        } catch (error) {
            next(error)
        }
    }

    public async updatePixLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { document } = req.params
            const pixLimits = req.body as Partial<QiTechTypes.Pix.IPixLimits> // Utilizando a interface IPixLimits parcialmente

            const service = QiTechService.getInstance()
            await service.updatePixLimits(document, pixLimits)

            res.json({ message: 'success' })
        } catch (error) {
            next(error)
        }
    }

    public async getPixLimitsRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const document = unMask(req.params.document)

            const requestStatus = req.query.requestStatus || 'pending_approval,approved,rejected,executed'

            const page = Number(req.query.page ?? '1')
            const pageSize = Number(req.query.pageSize ?? '100')

            const service = QiTechService.getInstance()
            const result = await service.getPixLimitsRequestByDocument(
                document as string,
                requestStatus as QiTechTypes.Pix.IPixRequestStatus,
                page,
                pageSize
            )

            res.json(result)
        } catch (error) {
            next(error)
        }
    }
}
