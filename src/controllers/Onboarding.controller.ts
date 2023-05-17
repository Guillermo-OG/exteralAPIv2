import { NextFunction, Request, Response } from 'express'
import { QITech } from '../infra'
import { NotFoundError, ValidationError } from '../models'
import { OnboardingLegalPersonRepository, OnboardingNaturalPersonRepository } from '../repository'
import { QiTechService } from '../services'
import { unMask } from '../utils/masks'

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
            const document = unMask(req.params.document)
            if (!document) {
                throw new ValidationError('Document required')
            }

            const qiTechService = QiTechService.getInstance()
            const repository = OnboardingNaturalPersonRepository.getInstance()
            let naturalPerson = await repository.getByDocument(document)

            if (!naturalPerson) {
                throw new NotFoundError('Onboarding not found for this document')
            }

            naturalPerson = await qiTechService.updateNaturalPerson(naturalPerson)
            res.json(naturalPerson)
        } catch (error) {
            next(error)
        }
    }

    public async listNaturalPerson(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const page = Number(req.query.page ?? '1')
            const status = (req.query.status as QITech.RequestStatus) || undefined
            const repository = OnboardingNaturalPersonRepository.getInstance()

            const onboardings = await repository.list(page, status)
            res.json(onboardings)
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
            const document = unMask(req.params.document)
            if (!document) {
                throw new ValidationError('Document required')
            }

            const qiTechService = QiTechService.getInstance()
            const repository = OnboardingLegalPersonRepository.getInstance()
            let legalPerson = await repository.getByDocument(document)

            if (!legalPerson) {
                throw new NotFoundError('Onboarding not found for this document')
            }

            legalPerson = await qiTechService.updateLegalPerson(legalPerson)
            res.json(legalPerson)
        } catch (error) {
            next(error)
        }
    }

    public async listLegalPerson(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const page = Number(req.query.page ?? '1')
            const status = (req.query.status as QITech.RequestStatus) || undefined
            const repository = OnboardingLegalPersonRepository.getInstance()

            const onboardings = await repository.list(page, status)
            res.json(onboardings)
        } catch (error) {
            next(error)
        }
    }
}
