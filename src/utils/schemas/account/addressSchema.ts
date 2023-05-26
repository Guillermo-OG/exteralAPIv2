import * as yup from 'yup'

const addressSchema = yup.object().shape({
    estado: yup
        .string()
        .required()
        .matches(/^[A-Z]{2}$/),
    cidade: yup.string().required(),
    cep: yup
        .string()
        .required()
        .matches(/^\d{8}$/),
    bairro: yup.string().required(),
    rua: yup.string().required(),
    numero: yup.string().required(),
    complemento: yup.string().required(),
})

export default addressSchema
