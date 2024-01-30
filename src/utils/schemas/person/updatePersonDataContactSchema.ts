import * as yup from 'yup'
import { BaseSchema } from './baseTokenSchema'

const PersonDataContactUpdateSchema = yup.object().shape({
    person_contact_update: yup.object().shape({
        pfDocument: yup.string().required('Documento da pessoa física é obrigatório'),
        email: yup.string().email('Email inválido'),
        phone_number: yup.object().shape({
            country_code: yup.string(),
            area_code: yup.string(),
            number: yup.string(),
        }),
    })
    .test(
        'emailOrPhoneNumber',
        'Email ou número de telefone deve ser fornecido',
        function(value) {
            const { email, phone_number } = value;
            const isEmailValid = email && email.length > 0;
            const isPhoneNumberValid = phone_number && phone_number.country_code && phone_number.area_code && phone_number.number;
            if (isEmailValid || isPhoneNumberValid) {
                return true;
            } else {
                return this.createError({
                    path: 'professional_data_contact_update',
                    message: 'Email ou número de telefone deve ser fornecido'
                });
            }
        }
    )
    .required('Dados profissionais para atualização de contato são obrigatórios')
});

export const UpdatePersonDataContactSchema = BaseSchema.concat(PersonDataContactUpdateSchema);