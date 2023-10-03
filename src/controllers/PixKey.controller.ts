import { NextFunction, Request, Response } from 'express'
import { ValidationError } from 'yup'
import { BillingConfigurationRepository, PixKeyRepository, PixLimitsRequestRepository } from '../repository'
import { QiTechTypes } from '../infra'
import { QiTechService } from '../services'
import { unMask } from '../utils/masks'
import { IPixLimitsRequest } from '../models'

export class PixKeyController {
    public async listByDocument(req: Request, res: Response, next: NextFunction) {
        try {
            const document = req.query.document
            const keyType = req.query.pixKeyType

            if (!document) {
                throw new ValidationError('Não foi encontrado o documento')
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
                throw new ValidationError('Não foi encontrado o documento')
            }
            const qiTechService = QiTechService.getInstance()
            const limits = await qiTechService.getPixLimitsByDocument(document as string)
            res.json(limits)
        } catch (error) {
            next(error)
        }
    }

    public async getLocalTaxesByDocument(req: Request, res: Response, next: NextFunction) {
        try {
            const document = unMask(req.params.document)
            if (!document) {
                throw new ValidationError('Não foi encontrado o documento')
            }
            const billingRepo = BillingConfigurationRepository.getInstance()
            const limits = await billingRepo.get(document)
            if (!limits) {
                throw new ValidationError('Limites não encontrados para este documento')
            }
            res.json(limits)
        } catch (error) {
            next(error)
        }
    }

    public async updatePixLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { document } = req.params
            const pixLimits = req.body as Partial<QiTechTypes.Pix.IPixLimits>
            const service = QiTechService.getInstance()

            const response = await service.updatePixLimits(document, pixLimits)

            // Salvar no novo modelo
            const pixLimitsRequestData: IPixLimitsRequest = {
                document,
                request: pixLimits,
                response,
            }
            const pixLimitsRepo = PixLimitsRequestRepository.getInstance()
            await pixLimitsRepo.create(pixLimitsRequestData)
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

    public async getBillingConfiguration(req: Request, res: Response, next: NextFunction) {
        try {
            const document = unMask(req.params.document)
            if (!document) {
                throw new ValidationError('No document specified')
            }

            const qiTechService = QiTechService.getInstance()
            const billingConfiguration = await qiTechService.getBillingConfigurationByDocument(document as string)

            res.json(billingConfiguration)
        } catch (error) {
            next(error)
        }
    }

    public async updateBillingConfiguration(req: Request, res: Response, next: NextFunction) {
        const qiTechService = QiTechService.getInstance()
        try {
            const document = unMask(req.params.document)
            if (!document) {
                throw new ValidationError('Documento não especificado')
            }

            const billingConfiguration = req.body

            const updatedBillingConfiguration = await qiTechService.updateBillingConfigurationByDocument(
                document as string,
                billingConfiguration
            )

            res.json(updatedBillingConfiguration)
        } catch (error) {
            next(await qiTechService.decodeError(error))
        }
    }

    public async updateALLBillingConfiguration(req: Request, res: Response, next: NextFunction): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            const billingConfiguration = req.body
            const pixRepository = PixKeyRepository.getInstance()

            const uniqueDocuments = await pixRepository.listUniqueDocuments()

            let updateCount = 0

            for (const document of uniqueDocuments) {
                try {
                    await qiTechService.updateBillingConfigurationByDocument(document, billingConfiguration)
                    updateCount++
                } catch (innerError) {
                    console.log('documento com erro:', document)
                }
            }

            res.json({ message: 'success', totalUpdated: updateCount })
        } catch (error) {
            next(await qiTechService.decodeError(error))
        }
    }

    public async setDefaultBillingConfiguration(req: Request, res: Response, next: NextFunction) {
        const qiTechService = QiTechService.getInstance()
        try {
            const document = unMask(req.params.document)
            if (!document) {
                throw new ValidationError('Documento não especificado')
            }

            const updatedBillingConfiguration = await qiTechService.setDefaultBillingConfiguration(document as string)

            res.json(updatedBillingConfiguration)
        } catch (error) {
            next(await qiTechService.decodeError(error))
        }
    }
}
