import * as yup from 'yup'
import { isValid } from 'date-fns'
import addressSchema from '../account/addressSchema'
import { BaseSchema } from './baseTokenSchema'

const PersonSchema = yup.object().shape({
    person_creation: yup.object().shape({
        person: yup.object().shape({
            date_of_birth: yup
                .string()
                .required('Data de nascimento é obrigatória')
                .test('Validação de data', 'Data inválida', value => {
                    return isValid(new Date(value))
                }),
            spouse_name: yup.string().nullable(),
            birth_place: yup.string().required('Local de nascimento é obrigatório'),
            phone_number: yup.object().shape({
                country_code: yup.string().required('Código do país é obrigatório'),
                area_code: yup.string().required('DDD é obrigatório'),
                number: yup.string().required('Número de telefone é obrigatório'),
            }),
            representative: yup.mixed().nullable(),
            father_name: yup.string().required('Nome do pai é obrigatório'),
            address: addressSchema,
            nationality: yup.string().required('Nacionalidade é obrigatória'),
            document_identification_number: yup.string().required('Número de identificação do documento é obrigatório'),
            mother_name: yup.string().required('Nome da mãe é obrigatório'),
            person_type: yup.string().required('Tipo de pessoa é obrigatório').oneOf(['natural'], 'Tipo de pessoa deve ser "natural"'),
            name: yup.string().required('Nome é obrigatório'),
            profession: yup.string().required('Profissão é obrigatória'),
            gender: yup.mixed().nullable(),
            email: yup.string().email('E-mail inválido').required('E-mail é obrigatório'),
            document_number: yup.string().required('Número do documento é obrigatório'),
            marital_status: yup.mixed().nullable(),
        }),
    }),
})

export const PersonCreationSchema = BaseSchema.concat(PersonSchema)
