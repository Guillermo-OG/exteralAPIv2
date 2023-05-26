import * as yup from 'yup'
import { unMask } from '../../masks'
import { isEmailValid, validateCNPJ, validateCPF } from '../../validations'
import { isValid } from 'date-fns'
import addressSchema from './addressSchema'

export const PjCreateSchema = new yup.ObjectSchema({
    account_owner: yup.object().shape({
        address: addressSchema,
        cnae_code: yup
            .string()
            .required()
            .test(value => {
                return unMask(value).length == 7
            }),
        email: yup
            .string()
            .required()
            .test(value => {
                return isEmailValid(value)
            }),
        foundation_date: yup
            .string()
            .required()
            .test(value => {
                return isValid(new Date(value))
            }),
        company_statute: yup.string().required(),
        company_document_number: yup
            .string()
            .required()
            .test(value => {
                return validateCNPJ(value)
            }),
        person_type: yup.string().required().oneOf(['legal']),
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
        trading_name: yup.string().required(),
        company_representatives: yup.array().of(
            yup.object().shape({
                address: addressSchema,
                birth_date: yup
                    .string()
                    .required()
                    .test(value => {
                        return isValid(new Date(value))
                    }),
                document_identification_number: yup.string().required(),
                document_identification: yup.string().required(),
                email: yup.string().required(),
                individual_document_number: yup
                    .string()
                    .required()
                    .test(value => {
                        return validateCPF(value)
                    }),
                is_pep: yup.boolean().required(),
                marital_status: yup.string().required(),
                mother_name: yup.string().required(),
                name: yup.string().required(),
                nationality: yup.string().required(),
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
            })
        ),
    }),
    allowed_user: yup.object().shape({
        email: yup
            .string()
            .required()
            .test(value => {
                return isEmailValid(value)
            }),
        individual_document_number: yup
            .string()
            .required()
            .test(value => {
                return validateCPF(value)
            }),
        name: yup.string().required(),
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
    }),
    callbackURL: yup.string().required(),
})
