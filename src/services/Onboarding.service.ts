import { AxiosError } from 'axios'
import { createHmac } from 'crypto'
import { format } from 'date-fns'
import { Request } from 'express'
import { v4 } from 'uuid'
import { ValidationError as YupValidationError } from 'yup'
import env from '../config/env'
import { OnboardingClient, Onboarding as OnboardingTypes } from '../infra'
import { IOnboarding, NotFoundError, OnboardingModel, ServerError, UnauthorizedError, ValidationError } from '../models'
import { OnboardingRepository } from '../repository'
import { maskCNPJ, maskCPF, unMask } from '../utils/masks'
import { legalPersonSchema, naturalPersonSchema, parseError } from '../utils/schemas'

export class OnboardingService {
    private static instance: OnboardingService
    private readonly api: OnboardingClient
    private readonly webhookSecret: string

    private constructor() {
        if (!env.ONBOARDING_API_SECRET || !env.ONBOARDING_BASE_URL || !env.ONBOARDING_WEBHOOK_SECRET) {
            throw new Error('Missing qi tech env variables')
        }
        this.webhookSecret = env.ONBOARDING_WEBHOOK_SECRET
        this.api = new OnboardingClient(env.ONBOARDING_BASE_URL, env.ONBOARDING_API_SECRET)
    }

    public static getInstance(): OnboardingService {
        if (!OnboardingService.instance) {
            OnboardingService.instance = new OnboardingService()
        }
        return OnboardingService.instance
    }

    public async createPerson(data: OnboardingTypes.INaturalPersonCreate | OnboardingTypes.ILegalPersonCreate): Promise<OnboardingModel> {
        const repository = OnboardingRepository.getInstance()
        const document = unMask(data.document_number)

        const onboardingModelData: IOnboarding = {
            document: document,
            request: data,
            response: undefined,
            data: undefined,
            status: OnboardingTypes.RequestStatus.PENDING,
        }

        let personModel = await repository.getByDocument(document)
        if (personModel) {
            if ([OnboardingTypes.RequestStatus.APPROVED, OnboardingTypes.RequestStatus.PENDING].includes(personModel.status)) {
                throw new ValidationError('Found existing valid onboarding for this document')
            }
        }
        try {
            let personResponse: OnboardingTypes.INaturalPersonCreateResponse | OnboardingTypes.ILegalPersonCreateResponse
            if ('legal_name' in data) {
                await legalPersonSchema.validate(data, { abortEarly: false })
                const formatedData = this.formatLegalPersonData(data)
                personResponse = await this.api.createLegalPerson(formatedData)
            } else {
                await naturalPersonSchema.validate(data, { abortEarly: false })
                const formatedData = this.formatNaturalPersonData(data)
                personResponse = await this.api.createNaturalPerson(formatedData)
            }

            onboardingModelData.response = personResponse
        } catch (error) {
            onboardingModelData.error = this.errorHandler(error)
            onboardingModelData.status = OnboardingTypes.RequestStatus.ERROR
        }

        if (personModel) {
            personModel.request = onboardingModelData.request
            personModel.response = onboardingModelData.response
            personModel.data = onboardingModelData.data
            personModel.status = onboardingModelData.status
            personModel.error = onboardingModelData.error
            await personModel.save()
        } else {
            personModel = await repository.create(onboardingModelData)
        }

        return await this.updateOnboarding(personModel)
    }

    public async updateOnboarding(onboarding: OnboardingModel) {
        if (onboarding.status === OnboardingTypes.RequestStatus.PENDING && onboarding.response) {
            let udaptedData: OnboardingTypes.ILegalPersonGetResponse | OnboardingTypes.INaturalPersonGetResponse
            if ('legal_name' in onboarding.request) {
                udaptedData = await this.api.getLegalPerson(onboarding.response.id)
            } else {
                udaptedData = await this.api.getNaturalPerson(onboarding.response.id)
            }
            const newStatus = this.mapQiTechStatusToVillelaStatus(udaptedData.analysis_status)
            if (onboarding.status !== newStatus) {
                onboarding.data = udaptedData
                onboarding.status = newStatus
                onboarding.markModified('data')
            }
        }

        if (onboarding.isModified()) {
            await onboarding.save()
        }

        return onboarding
    }

    public authenticateWebhook(req: Request): void {
        const signature = req.headers.signature
        const payload = req.body
        const method = req.method
        const endpoint = req.protocol + '://' + req.get('host') + req.originalUrl

        const hash = createHmac('sha1', this.webhookSecret)
            .update(endpoint + method + payload)
            .digest('hex')

        if (hash !== signature) {
            throw new UnauthorizedError()
        }
    }

    public async handleWebhook(data: OnboardingTypes.IWebhookBody) {
        const repository = OnboardingRepository.getInstance()
        let payload: unknown = null
        let url: string | null = null
        let onboarding: OnboardingModel | null = null

        if (data.legal_person_id) {
            onboarding = await repository.getByExternalId(data.legal_person_id)
        } else if (data.natural_person_id) {
            onboarding = await repository.getByExternalId(data.natural_person_id)
        }

        if (onboarding) {
            payload = await this.updateOnboarding(onboarding)
            // url = legalPerson.webhookUrl
            url = 'http://localhost:3000/webhook/mock'
        }

        if (!payload || !url) {
            throw new NotFoundError('Onboarding not found')
        }

        return {
            payload,
            url,
        }
    }

    private formatNaturalPersonData(data: OnboardingTypes.INaturalPersonCreate): OnboardingTypes.INaturalPersonCreate {
        data.id = v4()
        data.registration_id = v4()
        data.document_number = maskCPF(data.document_number)
        data.registration_date = this.formatDate(new Date(), true, true)
        return data
    }

    private formatLegalPersonData(data: OnboardingTypes.ILegalPersonCreate): OnboardingTypes.ILegalPersonCreate {
        data.id = v4()
        data.registration_id = v4()
        data.document_number = maskCNPJ(data.document_number)
        data.registration_date = this.formatDate(new Date(), true, true)
        return data
    }

    private formatDate(date: string | Date, dateTime = false, timeZone = false): string {
        const d = new Date(date)
        if (!dateTime) {
            return format(d, 'yyyy-MM-dd')
        }
        if (timeZone) {
            // eslint-disable-next-line quotes
            return format(d, "yyyy-MM-dd'T'hh:mm:ss.sssXXX")
        }
        // eslint-disable-next-line quotes
        return format(d, "yyyy-MM-dd'T'hh:mm:ss.sss'Z'")
    }

    private mapQiTechStatusToVillelaStatus(status: OnboardingTypes.AnalysisStatus): OnboardingTypes.RequestStatus {
        switch (status) {
            case OnboardingTypes.AnalysisStatus.AUTOMATICALLY_APPROVED:
            case OnboardingTypes.AnalysisStatus.MANUALLY_APPROVED:
                return OnboardingTypes.RequestStatus.APPROVED

            case OnboardingTypes.AnalysisStatus.IN_MANUAL_ANALYSIS:
            case OnboardingTypes.AnalysisStatus.IN_QUEUE:
            case OnboardingTypes.AnalysisStatus.NOT_ANALYSED:
            case OnboardingTypes.AnalysisStatus.PENDING:
                return OnboardingTypes.RequestStatus.PENDING

            case OnboardingTypes.AnalysisStatus.AUTOMATICALLY_REPROVED:
            case OnboardingTypes.AnalysisStatus.MANUALLY_REPROVED:
                return OnboardingTypes.RequestStatus.REPROVED

            default:
                return OnboardingTypes.RequestStatus.ERROR
        }
    }

    private errorHandler(err: unknown) {
        let response: { [attr: string]: unknown } = { message: 'Server Error' }

        //* Abstract handler for errors
        if (err instanceof ServerError) {
            response = { status: 500, error: err.name, message: err.message }
        } else if (err instanceof YupValidationError) {
            const parsedErrors = parseError(err)
            response = {
                status: 400,
                error: err.name,
                details: parsedErrors,
            }
        } else if (err instanceof AxiosError) {
            response = {
                status: err.response?.status ?? 500,
                error: 'Unexpected API Error: ' + (err.config?.baseURL || '') + (err.config?.url || ''),
                details: err.response?.data || err.cause,
            }
        } else if (err instanceof Error) {
            response = {
                status: 500,
                error: err.name,
                details: err.message,
            }
        }
        return response
    }
}
