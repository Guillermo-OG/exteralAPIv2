import { NextFunction, Request, Response } from 'express'
import { NotFoundError } from '../models'
import { AccountRepository, OnboardingRepository, PixKeyRepository } from '../repository'
import { unMask } from '../utils/masks'

export class StatusController {
    public async getStatusByDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const document = unMask(req.params.document)
            const account = await AccountRepository.getInstance().getByDocument(document)
            const onboarding = await OnboardingRepository.getInstance().getByDocument(document)
            const pixKeys = await PixKeyRepository.getInstance().listAllByDocument(document)

            let missingMessage = 'success'
            if (!account) missingMessage += 'Dados de conta não encontrados para este documento. '
            if (!onboarding) missingMessage += 'Dados de OnBoarding não encontrados para este documento. '
            if (!pixKeys) missingMessage += 'Dados de pix não encontrados para este documento. '

            if (!account && !onboarding && !pixKeys) {
                throw new NotFoundError('Dados não encontrados para este documento')
            }

            // Organize os dados conforme o formato desejado
            const response = {
                data: {
                    document,
                    accountStatus: account ? account.status : undefined,
                    onboardingStatus: onboarding ? onboarding.status : undefined,
                    pixKeys: pixKeys ? pixKeys.map(pixKey => ({ key: pixKey.key, type: pixKey.type, status: pixKey.status })) : undefined,
                },
                message: missingMessage,
            }

            res.json(response)
        } catch (error) {
            next(error)
        }
    }
}
