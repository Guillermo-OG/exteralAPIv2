import * as yup from 'yup'
import { isEmailValid, validateCPF } from '../../validations'
import { isValid } from 'date-fns'
import addressSchema from './addressSchema'

export const OnboardingPFSchema = new yup.ObjectSchema({
    external_id: yup.string().notRequired(),
    callbackURL: yup.string().required('URL de retorno é obrigatório'),
    account_owner: yup.object().shape({
        address: addressSchema,
        email: yup
            .string()
            .required('E-mail é obrigatório')
            .test('Validação de E-mail', 'E-mail inválido', value => {
                return isEmailValid(value)
            }),
        person_type: yup.string().required('Tipo de pessoa é obrigatório').oneOf(['natural'], 'Tipo de pessoa deve ser "natural"'),
        phone: yup.object().shape({
            area_code: yup
                .string()
                .required('DDD é obrigatório')
                .matches(/^\d{2}$/, 'DDD deve ter dois dígitos'),
            country_code: yup
                .string()
                .required('Código do país é obrigatório')
                .matches(/^\d{2}$/, 'Código do país deve ter dois dígitos'),
            number: yup
                .string()
                .required('Número de telefone é obrigatório')
                .matches(/^\d{9}$/, 'Número de telefone deve ter 9 dígitos'),
        }),
        individual_document_number: yup
            .string()
            .required('Número do documento individual é obrigatório')
            .test('Validação de CPF', 'CPF inválido', value => {
                return validateCPF(value)
            }),
        document_identification: yup.string().nullable().notRequired(),
        name: yup.string().required('Nome é obrigatório'),
        is_pep: yup.boolean().required('Campo is_pep é obrigatório'),
        mother_name: yup.string().required('Nome da mãe é obrigatório'),
        nationality: yup.string().required('Nacionalidade é obrigatória'),
        proof_of_residence: yup.string().nullable().notRequired(),
        birth_date: yup
            .string()
            .required('Data de nascimento é obrigatória')
            .test('Validação de data', 'Data inválida', value => {
                return isValid(new Date(value))
            }),
        face: yup.lazy(value =>
            value == null
                ? yup.object().nullable().notRequired()
                : yup.object().shape({
                    type: yup.string().required('Tipo é obrigatório'),
                    registration_key: yup.string().required('Chave de registro é obrigatória')
                  })
        ),
    }),
})
