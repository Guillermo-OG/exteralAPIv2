import { HydratedDocument } from 'mongoose'
import { RelatedPerson, RelatedPersonModel } from '../models'

export class RelatedPersonRepository {
    private static instance: RelatedPersonRepository

    public static getInstance(): RelatedPersonRepository {
        if (!RelatedPersonRepository.instance) {
            RelatedPersonRepository.instance = new RelatedPersonRepository()
        }
        return RelatedPersonRepository.instance
    }

    public async create(data: any): Promise<RelatedPersonModel> {
        return RelatedPerson.create(data)
    }

    public async getByDocument(document: string): Promise<HydratedDocument<RelatedPersonModel> | null> {
        return RelatedPerson.findOne(
            {
                individual_document_number: document,
            },
            null,
            {
                sort: {
                    _id: -1,
                },
            }
        )
    }
}
