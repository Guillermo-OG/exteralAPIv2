import * as yup from 'yup'

const addressSchema = yup.object().shape({
    state: yup
        .string()
        .required('Estado é obrigatório')
        .matches(/^[A-Z]{2}$/, 'Estado deve ter 2 letras maiúsculas'),
    city: yup.string().required('Cidade é obrigatória'),
    postal_code: yup
        .string()
        .required('CEP é obrigatório')
        .matches(/^\d{8}$/, 'CEP deve ter 8 dígitos'),
    neighborhood: yup.string().required('Bairro é obrigatório'),
    street: yup.string().required('Rua é obrigatória'),
    number: yup.string().required('Número é obrigatório'),
    complement: yup.string().required('Complemento é obrigatório'),
})

export default addressSchema
