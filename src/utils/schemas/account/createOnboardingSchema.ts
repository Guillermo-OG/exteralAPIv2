import * as yup from 'yup'
import { OnboardingPJSchema } from './onboardingPJSchemas'
import { OnboardingPFSchema } from './onboardingPFSchemas'

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export const CreateOnboardingSchema: any = yup.lazy(value => {
    if ('allowed_user' in value && !!value.allowed_user) {
        return OnboardingPJSchema
    } else {
        return OnboardingPFSchema
    }
})
