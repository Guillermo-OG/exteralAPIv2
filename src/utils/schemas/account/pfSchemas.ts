import * as yup from 'yup'
import { isEmailValid, validateCPF } from '../../validations'
import { isValid } from 'date-fns'
import addressSchema from './addressSchema'

export const PfCreateSchema = new yup.ObjectSchema({
    callbackURL: yup.string().required(),
    account_owner: yup.object().shape({
        address: addressSchema,
        email: yup
            .string()
            .required()
            .test(value => {
                return isEmailValid(value)
            }),
        person_type: yup.string().required().oneOf(['natural']),
        phone: yup.object().shape({
            area_code: yup
                .string()
                .required()
                .matches(/^\d{2}$/),
            country_code: yup
                .string()
                .required()
                .matches(/^\d{2}$/),
            number: yup
                .string()
                .required()
                .matches(/^\d{9}$/),
        }),
        individual_document_number: yup
            .string()
            .required()
            .test(value => {
                return validateCPF(value)
            }),
        document_identification: yup.string().required(),
        name: yup.string().required(),
        is_pep: yup.boolean().required(),
        mother_name: yup.string().required(),
        nationality: yup.string().required(),
        proof_of_residence: yup.string().required(),
        birth_date: yup
            .string()
            .required()
            .test(value => {
                return isValid(new Date(value))
            }),
    }),
})
