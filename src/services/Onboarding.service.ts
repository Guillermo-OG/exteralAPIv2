import { AxiosError } from 'axios'
import { createHmac } from 'crypto'
import { format } from 'date-fns'
import { Request } from 'express'
import { HydratedDocument } from 'mongoose'
import { v4 } from 'uuid'
import { ValidationError as YupValidationError } from 'yup'
import env from '../config/env'
import { Onboarding, OnboardingClient } from '../infra'
import { IOnboardingLegalPerson, IOnboardingNaturalPerson, NotFoundError, ServerError, UnauthorizedError, ValidationError } from '../models'
import { OnboardingLegalPersonRepository, OnboardingNaturalPersonRepository } from '../repository'
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

    public async createNaturalPerson(data: Onboarding.INaturalPersonCreate): Promise<HydratedDocument<IOnboardingNaturalPerson>> {
        const repository = OnboardingNaturalPersonRepository.getInstance()
        const document = unMask(data.document_number)
        const onboardingModelData: IOnboardingNaturalPerson = {
            document: document,
            request: data,
            response: undefined,
            data: undefined,
            status: Onboarding.RequestStatus.PENDING,
        }

        let personModel = await repository.getByDocument(document)
        if (personModel) {
            if ([Onboarding.RequestStatus.APPROVED, Onboarding.RequestStatus.PENDING].includes(personModel.status)) {
                throw new ValidationError('Found existing valid onboarding for this document')
            }
        }
        try {
            await naturalPersonSchema.validate(data, { abortEarly: false })
            const formatedData = this.formatNaturalPersonData(data)
            const personResponse = await this.api.createNaturalPerson(formatedData)

            onboardingModelData.response = personResponse
        } catch (error) {
            onboardingModelData.error = this.errorHandler(error)
            onboardingModelData.status = Onboarding.RequestStatus.ERROR
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

        return await this.updateNaturalPerson(personModel)
    }

    public async updateNaturalPerson(naturalPerson: HydratedDocument<IOnboardingNaturalPerson>) {
        if (naturalPerson.status === Onboarding.RequestStatus.PENDING && naturalPerson.response) {
            const data = await this.api.getNaturalPerson(naturalPerson.response.id)
            const newStatus = this.mapQiTechStatusToVillelaStatus(data.analysis_status)
            if (naturalPerson.status !== newStatus) {
                naturalPerson.data = data
                naturalPerson.status = newStatus
                naturalPerson.markModified('data')
            }
        }

        if (naturalPerson.isModified()) {
            await naturalPerson.save()
        }

        return naturalPerson
    }

    public async createLegalPerson(data: Onboarding.ILegalPersonCreate): Promise<HydratedDocument<IOnboardingLegalPerson>> {
        const repository = OnboardingLegalPersonRepository.getInstance()
        const document = unMask(data.document_number)
        const onboardingModelData: IOnboardingLegalPerson = {
            document: document,
            request: data,
            response: undefined,
            data: undefined,
            status: Onboarding.RequestStatus.PENDING,
        }

        let personModel = await repository.getByDocument(document)
        if (personModel) {
            if ([Onboarding.RequestStatus.APPROVED, Onboarding.RequestStatus.PENDING].includes(personModel.status)) {
                throw new ValidationError('Found existing valid onboarding for this document')
            }
        }

        try {
            await legalPersonSchema.validate(data, { abortEarly: false })
            const formatedData = this.formatLegalPersonData(data)
            const personResponse = await this.api.createLegalPerson(formatedData)

            onboardingModelData.response = personResponse
        } catch (error) {
            onboardingModelData.error = this.errorHandler(error)
            onboardingModelData.status = Onboarding.RequestStatus.ERROR
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

        return await this.updateLegalPerson(personModel)
    }

    public async updateLegalPerson(legalPerson: HydratedDocument<IOnboardingLegalPerson>) {
        if (legalPerson.status === Onboarding.RequestStatus.PENDING && legalPerson.response) {
            const data = await this.api.getLegalPerson(legalPerson.response.id)
            const newStatus = this.mapQiTechStatusToVillelaStatus(data.analysis_status)
            if (legalPerson.status !== newStatus) {
                legalPerson.data = data
                legalPerson.status = newStatus
                legalPerson.markModified('data')
            }
        }

        if (legalPerson.isModified()) {
            await legalPerson.save()
        }

        return legalPerson
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

    public async handleWebhook(data: Onboarding.IWebhookBody) {
        let payload: unknown = null
        let url: string | null = null
        if (data.legal_person_id) {
            const repository = OnboardingLegalPersonRepository.getInstance()
            const legalPerson = await repository.getByExternalId(data.legal_person_id)
            if (legalPerson) {
                payload = await this.updateLegalPerson(legalPerson)
                // url = legalPerson.webhookUrl
                url = 'http://localhost:3000/webhook/mock'
            }
        } else if (data.natural_person_id) {
            const repository = OnboardingNaturalPersonRepository.getInstance()
            const naturalPerson = await repository.getByExternalId(data.natural_person_id)
            if (naturalPerson) {
                payload = await this.updateNaturalPerson(naturalPerson)
                // url = naturalPerson.webhookUrl
                url = 'http://localhost:3000/webhook/mock'
            }
        }

        if (!payload || !url) {
            throw new NotFoundError('Onboarding not found')
        }

        return {
            payload,
            url,
        }
    }

    private formatNaturalPersonData(data: Onboarding.INaturalPersonCreate): Onboarding.INaturalPersonCreate {
        data.id = v4()
        data.registration_id = v4()
        data.document_number = maskCPF(data.document_number)
        data.registration_date = this.formatDate(new Date(), true, true)
        return data
    }

    private formatLegalPersonData(data: Onboarding.ILegalPersonCreate): Onboarding.ILegalPersonCreate {
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

    private mapQiTechStatusToVillelaStatus(status: Onboarding.AnalysisStatus): Onboarding.RequestStatus {
        switch (status) {
            case Onboarding.AnalysisStatus.AUTOMATICALLY_APPROVED:
            case Onboarding.AnalysisStatus.MANUALLY_APPROVED:
                return Onboarding.RequestStatus.APPROVED

            case Onboarding.AnalysisStatus.IN_MANUAL_ANALYSIS:
            case Onboarding.AnalysisStatus.IN_QUEUE:
            case Onboarding.AnalysisStatus.NOT_ANALYSED:
            case Onboarding.AnalysisStatus.PENDING:
                return Onboarding.RequestStatus.PENDING

            case Onboarding.AnalysisStatus.AUTOMATICALLY_REPROVED:
            case Onboarding.AnalysisStatus.MANUALLY_REPROVED:
                return Onboarding.RequestStatus.REPROVED

            default:
                return Onboarding.RequestStatus.ERROR
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
