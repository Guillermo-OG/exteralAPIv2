import { isValid } from 'date-fns'
import * as yup from 'yup'
import { unMask } from '../../masks'
import { isEmailValid, validateCNPJ, validateCPF } from '../../validations'
import addressSchema from './addressSchema'

export const OnboardingPJSchema = new yup.ObjectSchema({
    account_owner: yup.object().shape({
        address: addressSchema,
        name: yup.string().required('Nome é obrigatório'),
        cnae_code: yup
            .string()
            .required('Código CNAE é obrigatório')
            .test('Validação de comprimento do CNAE', 'CNAE deve ter 7 dígitos', value => {
                return unMask(value).length === 7
            }),
        email: yup
            .string()
            .required('E-mail é obrigatório')
            .test('Validação de E-mail', 'E-mail inválido', value => {
                return isEmailValid(value)
            }),
        foundation_date: yup
            .string()
            .required('Data de fundação é obrigatória')
            .test('Validação de data', 'Data inválida', value => {
                return isValid(new Date(value))
            }),
        company_statute: yup.string().nullable().notRequired(),
        annual_revenue_amount: yup
            .string()
            .required('Receita anual é obrigatória')
            .matches(/^[.\d]*$/, { message: 'Receita anual deve conter apenas dígitos e ponto' }),
        company_document_number: yup
            .string()
            .required('Número de documento da empresa é obrigatório')
            .test('Validação de CNPJ', 'CNPJ inválido', value => {
                return validateCNPJ(value)
            }),
        person_type: yup.string().required().oneOf(['legal']),
        phone: yup.object().shape({
            area_code: yup
                .string()
                .required('DDD é obrigatório')
                .matches(/^\d{2}$/, 'DDD deve ter dois dígitos'),
            country_code: yup
                .string()
                .required('Código do país é obrigatório')
                .matches(/^\d{2}$/),
            number: yup
                .string()
                .required('Número de telefone é obrigatório')
                .matches(/^\d{9}$/, 'Telefone deve ter nove dígitos'),
        }),
        trading_name: yup.string().required(),
        company_representatives: yup
            .array()
            .of(
                yup.object().shape({
                    address: addressSchema,
                    birth_date: yup
                        .string()
                        .required('Data de nascimento é obrigatória')
                        .test('Validação de data', 'Data inválida', value => {
                            return isValid(new Date(value))
                        }),
                    // document_identification_number: yup.string().required('Número de identificação do documento é obrigatório'),
                    document_identification: yup.string().nullable().notRequired(),
                    email: yup.string().required('E-mail é obrigatório'),
                    individual_document_number: yup
                        .string()
                        .required('Número de documento individual é obrigatório')
                        .test('Validação de CPF', 'CPF inválido', value => {
                            return validateCPF(value)
                        }),
                    is_pep: yup.boolean().required('Informação PEP é obrigatória'),
                    marital_status: yup.string().required('Estado civil é obrigatório'),
                    mother_name: yup.string().required('Nome da mãe é obrigatório'),
                    name: yup.string().required('Nome é obrigatório'),
                    nationality: yup.string().required('Nacionalidade é obrigatória'),
                    person_type: yup.string().required('Tipo de pessoa é obrigatório').oneOf(['natural'], 'Tipo de pessoa inválido'),
                    phone: yup.object().shape({
                        area_code: yup
                            .string()
                            .required('DDD é obrigatório')
                            .matches(/^\d{2}$/, { message: 'DDD deve ter dois dígitos' }),
                        country_code: yup
                            .string()
                            .required('Codigo do país é obrigatório')
                            .matches(/^\d{2}$/, { message: 'Codigo do país deve ter dois dígitos' }),
                        number: yup
                            .string()
                            .required('Número de telefone é obrigatório')
                            .matches(/^\d{9}$/, { message: 'Número de telefone deve ter 9 dígitos' }),
                    }),
                })
            )
            .min(1, 'Pelo menos um representante da empresa é necessário')
            .required('Representantes da empresa são obrigatórios'),
    }),
    allowed_user: yup.object().shape({
        email: yup
            .string()
            .required('E-mail é obrigatório')
            .test('Validação de E-mail', 'E-mail inválido', value => {
                return isEmailValid(value)
            }),
        individual_document_number: yup
            .string()
            .required('Número de documento individual é obrigatório')
            .test('Validação de CPF', 'CPF inválido', value => {
                return validateCPF(value)
            }),
        name: yup.string().required('Nome é obrigatório'),
        person_type: yup.string().required('Tipo de pessoa é obrigatório').oneOf(['natural'], 'Tipo de pessoa inválido'),
        phone: yup.object().shape({
            area_code: yup
                .string()
                .required('DDD é obrigatório')
                .matches(/^\d{2}$/, { message: 'DDD deve ter dois dígitos' }),
            country_code: yup
                .string()
                .required('Código do país é obrigatório')
                .matches(/^\d{2}$/, { message: 'Código do país deve ter dois dígitos' }),
            number: yup
                .string()
                .required('Número de telefone é obrigatório')
                .matches(/^\d{9}$/, { message: 'Número de telefone deve ter 9 dígitos' }),
        }),
    }),
    callbackURL: yup.string().required('URL de retorno é obrigatório'),
})
