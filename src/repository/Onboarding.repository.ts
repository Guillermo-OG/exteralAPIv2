import { FilterQuery } from 'mongoose'
import { Onboarding as OnboardingTypes } from '../infra'
import { IOnboarding, Onboarding, OnboardingModel } from '../models'
import { IPaginatedSearch, paginatedSearch } from '../utils/pagination'

export class OnboardingRepository {
    private static instance: OnboardingRepository

    public static getInstance(): OnboardingRepository {
        if (!OnboardingRepository.instance) {
            OnboardingRepository.instance = new OnboardingRepository()
        }
        return OnboardingRepository.instance
    }

    public async create(data: IOnboarding): Promise<OnboardingModel> {
        return await Onboarding.create(data)
    }

    public async getByDocument(document: string): Promise<OnboardingModel | null> {
        return await Onboarding.findOne(
            {
                document,
            },
            null,
            {
                sort: {
                    _id: -1,
                },
            }
        )
    }

    public async getByExternalId(id: string): Promise<OnboardingModel | null> {
        return await Onboarding.findOne(
            {
                $or: [
                    {
                        'response.legal_person_key': id,
                    },
                    {
                        'response.natural_person_key': id,
                    },
                ],
            },
            null,
            {
                sort: {
                    _id: -1,
                },
            }
        )
    }

    public async list(page: number, status?: OnboardingTypes.RequestStatus): Promise<IPaginatedSearch<IOnboarding>> {
        const filter: FilterQuery<IOnboarding> = {}
        if (status) {
            filter.status = {
                $eq: status,
            }
        }

        return paginatedSearch(Onboarding, {
            filter,
            page,
        })
    }
}
