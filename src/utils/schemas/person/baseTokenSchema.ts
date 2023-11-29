import * as yup from 'yup'

export const BaseSchema = yup
    .object()
    .shape({
        contact_type: yup.string().default('sms'),
        agent_document_number: yup.string().when('$isTokenRequired', (isTokenRequired, schema) => {
            return isTokenRequired ? schema.notRequired() : schema.required()
        }),
    })
    .concat(
        yup.object({
            token: yup.string().when('$isTokenRequired', (isTokenRequired, schema) => {
                return isTokenRequired ? schema.required() : schema.notRequired()
            }),
        })
    )
