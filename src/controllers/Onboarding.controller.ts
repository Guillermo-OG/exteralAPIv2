import { NextFunction, Request, Response } from 'express'
import { ValidationError } from '../models'
import { OnboardingLegalPersonRepository, OnboardingNaturalPersonRepository } from '../repository'
import { QiTechService } from '../services'

export class OnboardingController {
    public async createNaturalPerson(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const body = req.body
            const qiTechService = QiTechService.getInstance()

            const naturalPerson = await qiTechService.createNaturalPerson(body)

            res.json(naturalPerson)
        } catch (error) {
            next(error)
        }
    }

    public async getNaturalPersonByDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const document = ((req.query.document as string) || '').replace(/\D/g, '')

            if (!document) {
                throw new ValidationError('Document required')
            }

            const qiTechService = QiTechService.getInstance()
            const repository = OnboardingNaturalPersonRepository.getInstance()
            let naturalPerson = await repository.getByDocument(document)

            if (naturalPerson) {
                naturalPerson = await qiTechService.updateNaturalPerson(naturalPerson)
            }

            res.send({
                found: !!naturalPerson,
                data: naturalPerson,
            })
        } catch (error) {
            next(error)
        }
    }

    public async createLegalPerson(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const body = req.body
            const qiTechService = QiTechService.getInstance()

            const legalPerson = await qiTechService.createLegalPerson(body)

            res.json(legalPerson)
        } catch (error) {
            next(error)
        }
    }

    public async getLegalPersonByDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const document = ((req.query.document as string) || '').replace(/\D/g, '')

            if (!document) {
                throw new ValidationError('Document required')
            }

            const repository = OnboardingLegalPersonRepository.getInstance()
            const legalPerson = await repository.getByDocument(document)

            res.send({
                found: !!legalPerson,
                data: legalPerson,
            })
        } catch (error) {
            next(error)
        }
    }
}
