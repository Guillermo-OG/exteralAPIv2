import * as yup from 'yup'
import { unMask } from '../../masks'
import { validateCNPJ, validateCPF } from '../../validations'

export const fileCreateSchema = new yup.ObjectSchema({
    type: yup.string().required(),
    document: yup
        .string()
        .required()
        .test(value => {
            const raw = unMask(value)
            if (raw.length > 11) {
                return validateCNPJ(value)
            }
            return validateCPF(value)
        }),
})
