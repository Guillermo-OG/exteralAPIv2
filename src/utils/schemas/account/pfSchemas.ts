import * as yup from 'yup'
import { unMask } from '../../masks'
import { isEmailValid, isPhoneValid, validateCNPJ, validateCPF } from '../../validations'
import { isValid } from 'date-fns'
import addressSchema from './addressSchema'

export const PfCreateSchema = new yup.ObjectSchema({
    callbackURL: yup.string().required(),
    cpfCnpj: yup
        .string()
        .required()
        .test(value => {
            const raw = unMask(value)
            if (raw.length > 11) {
                return validateCNPJ(raw)
            }
            return validateCPF(raw)
        }),
    email: yup
        .string()
        .required()
        .test(value => {
            return isEmailValid(value)
        }),
    dataAbertura: yup
        .string()
        .required()
        .test(value => {
            return isValid(new Date(value))
        }),
    celular: yup
        .string()
        .test(value => {
            if (value) {
                return isPhoneValid(value)
            }
            return true
        })
        .nullable(),
    razaoSocial: yup.string().required(),
    usuarios: yup.array().of(
        yup.object().shape({
            email: yup
                .string()
                .required()
                .test(value => {
                    return isEmailValid(value)
                }),
            nome: yup.string().required(),
            pep: yup.boolean().required(),
            dataNascimento: yup
                .string()
                .required()
                .test(value => {
                    return isValid(new Date(value))
                }),
            cpf: yup
                .string()
                .required()
                .test(value => {
                    return validateCPF(value)
                }),
            celular: yup.string().test(value => {
                if (value) {
                    return isPhoneValid(value)
                }
                return true
            }),
            conta: yup.object().shape({
                subConta: yup.object().shape({
                    cnae: yup.string().required(),
                    nomeFantasia: yup.string().required(),
                    nomeMae: yup.string().required(),
                    nacionalidade: yup.string().required(),
                    rgNumero: yup
                        .string()
                        .required()
                        .matches(/^\d{9}$/),
                }),
            }),
        })
    ),
    endereco: addressSchema,
})
