import { FilterQuery, HydratedDocument } from 'mongoose'
import { Onboarding } from '../infra'
import { IOnboardingLegalPerson, OnboardingLegalPerson } from '../models'
import { IPaginatedSearch, paginatedSearch } from '../utils/pagination'

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
        return await OnboardingLegalPerson.findOne(
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

    public async getByExternalId(id: string): Promise<HydratedDocument<IOnboardingLegalPerson> | null> {
        return await OnboardingLegalPerson.findOne(
            {
                'response.legal_person_key': id,
            },
            null,
            {
                sort: {
                    _id: -1,
                },
            }
        )
    }

    public async list(page: number, status?: Onboarding.RequestStatus): Promise<IPaginatedSearch<IOnboardingLegalPerson>> {
        const filter: FilterQuery<IOnboardingLegalPerson> = {}
        if (status) {
            filter.status = {
                $eq: status,
            }
        }

        return paginatedSearch(OnboardingLegalPerson, {
            filter,
            page,
        })
    }
}
