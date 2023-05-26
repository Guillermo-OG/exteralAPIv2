import * as yup from 'yup'
import { PjCreateSchema } from './pjSchemas'
import { PfCreateSchema } from './pfSchemas'

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export const CreateAccountSchema: any = yup.lazy(value => {
    if ('allowed_user' in value) {
        return PjCreateSchema
    } else {
        return PfCreateSchema
    }
})


