import * as yup from 'yup'
import { unMask } from '../../masks'
import { isEmailValid, isPhoneValid, validateCNPJ, validateCPF } from '../../validations'
import { isValid } from 'date-fns'
import addressSchema from './addressSchema'

export const PjCreateSchema = new yup.ObjectSchema({
    conta: yup.object().shape({
        endereco: addressSchema,
        cpfCnpj: yup
            .string()
            .required()
            .test(value => {
                const raw = unMask(value)
                if (raw.length > 11) {
                    return validateCNPJ(value)
                }
                return validateCPF(value)
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
        razaoSocial: yup.string().required(),
    }),
    usuario: yup.object().shape({
        celular: yup
            .string()
            .required()
            .test(value => {
                return isPhoneValid(value)
            }),
        email: yup
            .string()
            .required()
            .test(value => {
                return isEmailValid(value)
            }),
        cpf: yup
            .string()
            .required()
            .test(value => {
                return validateCPF(value)
            }),
        nome: yup.string().required(),
        conta: yup.object().shape({
            subconta: yup.object().shape({
                cnae: yup.string().required(),
                nomeFantasia: yup.string().required(),
                nomeMae: yup.string().required(),
                nacionalidade: yup.string().required(),
                rgNumero: yup
                    .string()
                    .required()
                    .matches(/^\d{9}$/),
            }),
            socios: yup.array().of(
                yup.object().shape({
                    contaSocio: yup.object().shape({
                        endereco: addressSchema,
                        cpfCnpj: yup
                            .string()
                            .required()
                            .test(value => {
                                const raw = unMask(value)
                                if (raw.length > 11) {
                                    return validateCNPJ(value)
                                }
                                return validateCPF(value)
                            }),
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
                                celular: yup
                                    .string()
                                    .test(value => {
                                        if (value) {
                                            return isPhoneValid(value)
                                        }
                                        return true
                                    })
                                    .nullable(),
                            })
                        ),
                    }),
                })
            ),
        }),
    }),
    callbackURL: yup.string().required(),
})
