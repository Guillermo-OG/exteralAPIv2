import { HydratedDocument } from 'mongoose'
import { IOnboardingLegalPerson, OnboardingLegalPerson } from '../models'

export class OnboardingLegalPersonRepository {
    private static instance: OnboardingLegalPersonRepository

    public static getInstance(): OnboardingLegalPersonRepository {
        if (!OnboardingLegalPersonRepository.instance) {
            OnboardingLegalPersonRepository.instance = new OnboardingLegalPersonRepository()
        }
        return OnboardingLegalPersonRepository.instance
    }

    public async create(data: IOnboardingLegalPerson): Promise<HydratedDocument<IOnboardingLegalPerson>> {
        return await OnboardingLegalPerson.create(data)
    }

    public async getByDocument(document: string): Promise<HydratedDocument<IOnboardingLegalPerson> | null> {
        return await OnboardingLegalPerson.findOne({
            document,
        })
    }
}
