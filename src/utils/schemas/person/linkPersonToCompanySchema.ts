﻿import * as yup from 'yup'
import { BaseSchema } from './baseTokenSchema'

const ProfessionalDataCreationSchema = yup.object().shape({
    professional_data_creation: yup.object().shape({
        pfDocument: yup.string().required('Documento da pessoa física é obrigatório'),
        pjDocument: yup.string().required('Documento da pessoa jurídica é obrigatório'),
        natural_person_roles: yup
            .array()
            .of(
                yup.object().shape({
                    product_type: yup.string().required('Tipo de produto é obrigatório'),
                    role_type: yup.string().required('Tipo de papel é obrigatório'),
                })
            )
            .required('Papéis da pessoa natural são obrigatórios'),
        post_type: yup.string().required('Tipo de cargo é obrigatório'),
    }),
})

export const LinkPersonToCompanySchema = BaseSchema.concat(ProfessionalDataCreationSchema)
