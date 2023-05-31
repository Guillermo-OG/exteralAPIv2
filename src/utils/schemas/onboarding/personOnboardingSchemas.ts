import * as yup from 'yup'
import { Onboarding } from '../../../infra'
import { validateCNPJ, validateCPF } from '../../validations'

export const naturalPersonSchema = new yup.ObjectSchema({
    document_number: yup.string().test('validateCPF', validateCPF).required(),
    name: yup.string().min(2).required(),
    mother_name: yup.string().min(2).required(),
    birthdate: yup
        .string()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .required(),
})

export const legalPersonSchema = new yup.ObjectSchema({
    document_number: yup.string().test('validateCNPJ', validateCNPJ).required(),
    legal_name: yup.string().min(2).required(),
    trading_name: yup.string().min(2).required(),
    foundation_date: yup
        .string()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .required(),
    address: yup.object().shape({
        street: yup.string().required(),
        number: yup.string().required(),
        neighborhood: yup.string().required(),
        city: yup.string().required(),
        uf: yup
            .string()
            .matches(/^[A-Z]{2}$/)
            .required(),
        complement: yup.string().required(),
        postal_code: yup
            .string()
            .matches(/^\d{5}-\d{3}$/)
            .required(),
        country: yup.string().length(3).required(),
        validation_type: yup.string().oneOf(['visit']).required(),
    }),
})

export const onboardingPersonListSchema = new yup.ObjectSchema({
    page: yup.number().min(1).nullable(),
    status: yup.string().oneOf(Object.values(Onboarding.RequestStatus)).nullable(),
})
