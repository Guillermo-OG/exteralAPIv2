import * as yup from 'yup'
import { PjCreateSchema } from './pjSchemas'
import { PfCreateSchema } from './pfSchemas'

export const CreateAccountSchema: any = yup.lazy(value => {
    if ('conta' in value) {
        return PjCreateSchema
    } else {
        return PfCreateSchema
    }
})


