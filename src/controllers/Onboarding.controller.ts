import { NextFunction, Request, Response } from 'express'
import { OnboardingTypes } from '../infra'
import { NotFoundError, ValidationError } from '../models'
import { OnboardingRepository } from '../repository'
import { OnboardingService } from '../services'
import { unMask } from '../utils/masks'

export class OnboardingController {
    public async getByDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const document = unMask(req.params.document)
            if (!document) {
                throw new ValidationError('Document required')
            }

            const qiTechService = OnboardingService.getInstance()
            const repository = OnboardingRepository.getInstance()
            let onboarding = await repository.getByDocument(document)

            if (!onboarding) {
                throw new NotFoundError('Onboarding not found for this document')
            }

            onboarding = await qiTechService.updateOnboarding(onboarding)
            res.json(onboarding)
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
}
