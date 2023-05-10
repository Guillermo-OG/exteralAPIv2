import { FilterQuery, HydratedDocument } from 'mongoose'
import { QITech } from '../infra'
import { IOnboardingNaturalPerson, OnboardingNaturalPerson } from '../models'
import { IPaginatedSearch, paginatedSearch } from '../utils/pagination'

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
        return await OnboardingNaturalPerson.findOne(
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

    public async list(page: number, status?: QITech.RequestStatus): Promise<IPaginatedSearch<IOnboardingNaturalPerson>> {
        const filter: FilterQuery<IOnboardingNaturalPerson> = {}
        if (status) {
            filter.status = {
                $eq: status,
            }
        }

        return paginatedSearch(OnboardingNaturalPerson, {
            filter: filter,
            page,
        })
    }
}
