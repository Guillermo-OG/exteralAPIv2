import * as yup from 'yup'
import { BaseSchema } from './baseTokenSchema'

const ProfessionalDataDeletionSchema = yup.object().shape({
    professional_data_deletion: yup.object().shape({
        pfDocument: yup.string().required('Documento da pessoa física é obrigatório'),
        pjDocument: yup.string().required('Documento da pessoa jurídica é obrigatório'),
    }),
})

export const UnlinkPersonToCompanySchema = BaseSchema.concat(ProfessionalDataDeletionSchema)
