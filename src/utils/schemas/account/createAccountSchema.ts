import * as yup from 'yup'
import { PjCreateSchema } from './pjSchemas'
import { PfCreateSchema } from './pfSchemas'

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export const CreateAccountSchema: any = yup.lazy(value => {
    if ('company_document_number' in value.account_owner && !!value.allowed_user) {
        return PjCreateSchema
    } else {
        return PfCreateSchema
    }
})


