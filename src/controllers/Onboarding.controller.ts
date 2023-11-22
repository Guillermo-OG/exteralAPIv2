import { NextFunction, Request, Response } from 'express'
import { OnboardingTypes } from '../infra'
import { NotFoundError, ValidationError } from '../models'
import { OnboardingRepository } from '../repository'
import { OnboardingService } from '../services'
import { unMask } from '../utils/masks'
import { Schema } from 'mongoose'

export class OnboardingController {
    public async getAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const document = unMask(req.params.document)
            if (!document) {
                throw new ValidationError('Documento obrigatório')
            }

            const repository = OnboardingRepository.getInstance()
            const onboarding = await repository.getByDocument(document)

            if (!onboarding) {
                throw new NotFoundError('Onboarding não encontrado para este documento')
            }

            const qiTechService = OnboardingService.getInstance()
            const analysis = await qiTechService.getAnalysis(onboarding)

            res.json(analysis)
        } catch (error) {
            next(error)
        }
    }

    public async getByDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const document = unMask(req.params.document)
            if (!document) {
                throw new ValidationError('Document required')
            }

            const qiTechService = OnboardingService.getInstance()
            const repository = OnboardingRepository.getInstance()
            const onboarding = await repository.getByDocument(document)

            if (!onboarding) {
                throw new NotFoundError('Onboarding não encontrado para este documento')
            }

            const analysis = await qiTechService.getAnalysis(onboarding)
            res.json(analysis)
        } catch (error) {
            next(error)
        }
    }

    public async listOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const page = Number(req.query.page ?? '1')
            const status = (req.query.status as OnboardingTypes.RequestStatus) || undefined
            const repository = OnboardingRepository.getInstance()

            const onboardings = await repository.list(page, status)
            res.json(onboardings)
        } catch (error) {
            next(error)
        }
    }

    public async createOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const origin = req.body.origin // Ou req.query.origin, dependendo de como você quer receber
            const data = req.body.data
            const accountId = req.body.accountId ? (req.body.accountId as Schema.Types.ObjectId) : undefined

            const onboardingService = OnboardingService.getInstance()
            const onboarding = await onboardingService.createOnboarding(data, accountId, origin)

            res.json(onboarding)
        } catch (error) {
            next(error)
        }
    }

    // public async updatePerson(req: Request, res: Response, next: NextFunction): Promise<void> {
    //     const qiTechService = OnboardingService.getInstance()
    //     try {
    //         const { document } = req.params
    //         const { phone_number } = req.body
    //         const { email } = req.body

    //         const response = await qiTechService.updateContact(document, phone_number, email)

    //         res.json(response)
    //     } catch (error) {
    //         next(error)
    //     }
    // }
}
