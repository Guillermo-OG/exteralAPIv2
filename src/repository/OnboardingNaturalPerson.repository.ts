import { HydratedDocument } from 'mongoose'
import { IOnboardingNaturalPerson, OnboardingNaturalPerson } from '../models'

export class OnboardingNaturalPersonRepository {
    private static instance: OnboardingNaturalPersonRepository

    public static getInstance(): OnboardingNaturalPersonRepository {
        if (!OnboardingNaturalPersonRepository.instance) {
            OnboardingNaturalPersonRepository.instance = new OnboardingNaturalPersonRepository()
        }
        return OnboardingNaturalPersonRepository.instance
    }

    public async create(data: IOnboardingNaturalPerson): Promise<HydratedDocument<IOnboardingNaturalPerson>> {
        return await OnboardingNaturalPerson.create(data)
    }

    public async getByDocument(document: string): Promise<HydratedDocument<IOnboardingNaturalPerson> | null> {
        return await OnboardingNaturalPerson.findOne({
            document,
        })
    }
}
