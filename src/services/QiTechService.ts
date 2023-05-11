import { AxiosError } from 'axios'
import { format } from 'date-fns'
import { HydratedDocument } from 'mongoose'
import { v4 } from 'uuid'
import { ValidationError as YupValidationError } from 'yup'
import env from '../config/env'
import { QITech, QiTechClient } from '../infra'
import { IOnboardingLegalPerson, IOnboardingNaturalPerson, NotFoundError, ServerError, ValidationError } from '../models'
import { OnboardingLegalPersonRepository, OnboardingNaturalPersonRepository } from '../repository'
import { maskCNPJ, maskCPF, unMask } from '../utils/masks'
import { legalPersonSchema, naturalPersonSchema, parseError } from '../utils/schemas'

export class QiTechService {
    private static instance: QiTechService
    private readonly api: QiTechClient

    private constructor() {
        if (!env.QI_TECH_API_SECRET || !env.QI_TECH_BASE_URL) {
            throw new Error('Missing qi tech env variables')
        }
        this.api = new QiTechClient(env.QI_TECH_BASE_URL, env.QI_TECH_API_SECRET)
    }

    public static getInstance(): QiTechService {
        if (!QiTechService.instance) {
            QiTechService.instance = new QiTechService()
        }
        return QiTechService.instance
    }

    public async createNaturalPerson(data: QITech.INaturalPersonCreate): Promise<HydratedDocument<IOnboardingNaturalPerson>> {
        const repository = OnboardingNaturalPersonRepository.getInstance()
        const document = unMask(data.document_number)
        const reprovedStatus = [QITech.AnalysisStatus.AUTOMATICALLY_REPROVED, QITech.AnalysisStatus.MANUALLY_REPROVED]
        const onboardingModelData: IOnboardingNaturalPerson = {
            document: document,
            request: data,
            response: undefined,
            data: undefined,
            status: QITech.RequestStatus.PENDING,
        }

        let personModel = await repository.getByDocument(document)
        if (personModel) {
            if (
                personModel.status !== QITech.RequestStatus.ERROR &&
                personModel.data &&
                !reprovedStatus.includes(personModel.data.analysis_status)
            ) {
                throw new ValidationError('Found existing valid onboarding for this document')
            }
            if (personModel.status === QITech.RequestStatus.RETRY) {
                throw new ValidationError('Found existing onboarding for this document, use retry route')
            }
        }
        try {
            await naturalPersonSchema.validate(data, { abortEarly: false })
            const formatedData = this.formatNaturalPersonData(data)
            const personResponse = await this.api.createNaturalPerson(formatedData)

            onboardingModelData.response = personResponse
        } catch (error) {
            onboardingModelData.error = this.errorHandler(error)
            onboardingModelData.status = onboardingModelData.error.status === 400 ? QITech.RequestStatus.ERROR : QITech.RequestStatus.RETRY
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
        const pendingStatus = [
            QITech.AnalysisStatus.IN_MANUAL_ANALYSIS,
            QITech.AnalysisStatus.IN_QUEUE,
            QITech.AnalysisStatus.NOT_ANALYSED,
            QITech.AnalysisStatus.PENDING,
        ]

        if (naturalPerson.status === QITech.RequestStatus.PENDING && naturalPerson.response) {
            const data = await this.api.getNaturalPerson(naturalPerson.response.id)
            naturalPerson.data = data
            if (!pendingStatus.includes(data.analysis_status)) {
                naturalPerson.status = QITech.RequestStatus.FINISHED
            }
            naturalPerson.markModified('data')
        }

        if (naturalPerson.isModified()) {
            await naturalPerson.save()
        }

        return naturalPerson
    }

    public async retryNaturalPerson(documentNumber: string): Promise<HydratedDocument<IOnboardingNaturalPerson>> {
        const repository = OnboardingNaturalPersonRepository.getInstance()
        const document = unMask(documentNumber)

        const naturalPerson = await repository.getByDocument(document)
        if (!naturalPerson) {
            throw new NotFoundError('Onboarding not found')
        } else if (naturalPerson.status === QITech.RequestStatus.ERROR) {
            throw new ValidationError('Onboarding has invalid data, create a new one')
        } else if (naturalPerson.status !== QITech.RequestStatus.RETRY) {
            throw new ValidationError('This document have a valid onboarding')
        }

        try {
            const personResponse = await this.api.createNaturalPerson(this.formatNaturalPersonData(naturalPerson.request))
            naturalPerson.status = QITech.RequestStatus.PENDING
            naturalPerson.response = personResponse
            naturalPerson.error = undefined
            naturalPerson.markModified('response')
        } catch (error) {
            naturalPerson.error = this.errorHandler(error)
            naturalPerson.status = naturalPerson.error.status === 400 ? QITech.RequestStatus.ERROR : QITech.RequestStatus.RETRY
        }
        naturalPerson.markModified('error')

        return await this.updateNaturalPerson(naturalPerson)
    }

    public async createLegalPerson(data: QITech.ILegalPersonCreate): Promise<HydratedDocument<IOnboardingLegalPerson>> {
        const repository = OnboardingLegalPersonRepository.getInstance()
        const document = unMask(data.document_number)
        const reprovedStatus = [QITech.AnalysisStatus.AUTOMATICALLY_REPROVED, QITech.AnalysisStatus.MANUALLY_REPROVED]
        const onboardingModelData: IOnboardingLegalPerson = {
            document: document,
            request: data,
            response: undefined,
            data: undefined,
            status: QITech.RequestStatus.PENDING,
        }

        let personModel = await repository.getByDocument(document)
        if (personModel) {
            if (
                personModel.status !== QITech.RequestStatus.ERROR &&
                personModel.data &&
                !reprovedStatus.includes(personModel.data.analysis_status)
            ) {
                throw new ValidationError('Found existing valid onboarding for this document')
            }
            if (personModel.status === QITech.RequestStatus.RETRY) {
                throw new ValidationError('Found existing onboarding for this document, use retry route')
            }
        }

        try {
            await legalPersonSchema.validate(data, { abortEarly: false })
            const formatedData = this.formatLegalPersonData(data)
            const personResponse = await this.api.createLegalPerson(formatedData)

            onboardingModelData.response = personResponse
        } catch (error) {
            onboardingModelData.error = this.errorHandler(error)
            onboardingModelData.status = onboardingModelData.error.status === 400 ? QITech.RequestStatus.ERROR : QITech.RequestStatus.RETRY
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
        const pendingStatus = [
            QITech.AnalysisStatus.IN_MANUAL_ANALYSIS,
            QITech.AnalysisStatus.IN_QUEUE,
            QITech.AnalysisStatus.NOT_ANALYSED,
            QITech.AnalysisStatus.PENDING,
        ]
        if (legalPerson.status === QITech.RequestStatus.PENDING && legalPerson.response) {
            const data = await this.api.getLegalPerson(legalPerson.response.id)
            legalPerson.data = data
            if (!pendingStatus.includes(data.analysis_status)) {
                legalPerson.status = QITech.RequestStatus.FINISHED
            }
            legalPerson.markModified('data')
        }

        if (legalPerson.isModified()) {
            await legalPerson.save()
        }

        return legalPerson
    }

    public async retryLegalPerson(documentNumber: string): Promise<HydratedDocument<IOnboardingLegalPerson>> {
        const repository = OnboardingLegalPersonRepository.getInstance()
        const document = unMask(documentNumber)

        const legalPerson = await repository.getByDocument(document)
        if (!legalPerson) {
            throw new NotFoundError('Onboarding not found')
        } else if (legalPerson.status === QITech.RequestStatus.ERROR) {
            throw new ValidationError('Onboarding has invalid data, create a new one')
        } else if (legalPerson.status !== QITech.RequestStatus.RETRY) {
            throw new ValidationError('This document have a valid onboarding')
        }

        try {
            const personResponse = await this.api.createLegalPerson(this.formatLegalPersonData(legalPerson.request))
            legalPerson.status = QITech.RequestStatus.FINISHED
            legalPerson.response = personResponse
            legalPerson.error = undefined
            legalPerson.markModified('response')
        } catch (error) {
            legalPerson.error = this.errorHandler(error)
            legalPerson.status = legalPerson.error.status === 400 ? QITech.RequestStatus.ERROR : QITech.RequestStatus.RETRY
        }
        legalPerson.markModified('error')

        return await this.updateLegalPerson(legalPerson)
    }

    private formatNaturalPersonData(data: QITech.INaturalPersonCreate): QITech.INaturalPersonCreate {
        data.id = v4()
        data.registration_id = v4()
        data.document_number = maskCPF(data.document_number)
        data.registration_date = this.formatDate(new Date(), true, true)
        return data
    }

    private formatLegalPersonData(data: QITech.ILegalPersonCreate): QITech.ILegalPersonCreate {
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
