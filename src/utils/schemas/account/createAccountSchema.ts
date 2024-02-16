import * as yup from 'yup'
import { PjCreateSchema } from './pjSchemas'
import { PfCreateSchema } from './pfSchemas'

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export const CreateAccountSchema: any = yup.lazy(value => {
    if ('account_owner.company_document_number' in value && !!value.allowed_user) {
        return PjCreateSchema
    } else {
        return PfCreateSchema
    }
})
