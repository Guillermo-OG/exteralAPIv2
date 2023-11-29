import * as yup from 'yup'
import { BaseSchema } from './baseTokenSchema'

const ProfessionalDataDeletionSchema = yup.object().shape({
    professional_data_deletion: yup.object().shape({
        natural_person: yup.string().required('ID da pessoa natural é obrigatório'),
        legal_person: yup.string().required('ID da pessoa jurídica é obrigatório'),
    }),
})

export const UnlinkPersonToCompanySchema = BaseSchema.concat(ProfessionalDataDeletionSchema)
