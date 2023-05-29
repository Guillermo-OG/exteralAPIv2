import * as yup from 'yup'

const addressSchema = yup.object().shape({
    state: yup
        .string()
        .required()
        .matches(/^[A-Z]{2}$/),
    city: yup.string().required(),
    postal_code: yup
        .string()
        .required()
        .matches(/^\d{8}$/),
    neighborhood: yup.string().required(),
    street: yup.string().required(),
    number: yup.string().required(),
    complement: yup.string().required(),
})

export default addressSchema
