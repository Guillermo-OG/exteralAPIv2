import { format } from 'date-fns'
import { HydratedDocument } from 'mongoose'
import { v4 } from 'uuid'
import env from '../config/env'
import { QITech, QiTechClient } from '../infra'
import { IOnboardingLegalPerson, IOnboardingNaturalPerson, ValidationError } from '../models'
import { OnboardingLegalPersonRepository, OnboardingNaturalPersonRepository } from '../repository'
import { maskCNPJ, maskCPF } from '../utils/masks'

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
        const document = data.document_number.replace(/\D/g, '')
        const reprovedStatus = [QITech.AnalysisStatus.AUTOMATICALLY_REPROVED, QITech.AnalysisStatus.MANUALLY_REPROVED]

        let personModel = await repository.getByDocument(document)
        if (personModel && (!personModel.data || (personModel.data && !reprovedStatus.includes(personModel.data.analysis_status)))) {
            throw new ValidationError('Found existing onboarding for this document')
        }

        const formatedData = this.formatNaturalPersonData(data)
        const personResponse = await this.api.createNaturalPerson(formatedData)

        personModel = await repository.create({
            document: document,
            request: formatedData,
            response: personResponse,
            data: undefined,
        })
        return await this.updateNaturalPerson(personModel)
    }

    public async updateNaturalPerson(naturalPerson: HydratedDocument<IOnboardingNaturalPerson>) {
        const pendingStatus = [
            QITech.AnalysisStatus.IN_MANUAL_ANALYSIS,
            QITech.AnalysisStatus.IN_QUEUE,
            QITech.AnalysisStatus.NOT_ANALYSED,
            QITech.AnalysisStatus.PENDING,
        ]
        if (!naturalPerson.data || (naturalPerson.data && pendingStatus.includes(naturalPerson.data.analysis_status))) {
            const data = await this.api.getNaturalPerson(naturalPerson.response.id)
            naturalPerson.data = data
            naturalPerson.markModified('data')
            await naturalPerson.save()
        }
        return naturalPerson
    }

    public async createLegalPerson(data: QITech.ILegalPersonCreate): Promise<HydratedDocument<IOnboardingLegalPerson>> {
        const repository = OnboardingLegalPersonRepository.getInstance()
        const document = data.document_number.replace(/\D/g, '')
        const reprovedStatus = [QITech.AnalysisStatus.AUTOMATICALLY_REPROVED, QITech.AnalysisStatus.MANUALLY_REPROVED]

        let personModel = await repository.getByDocument(document)
        if (personModel && (!personModel.data || (personModel.data && !reprovedStatus.includes(personModel.data.analysis_status)))) {
            throw new ValidationError('Found existing onboarding for this document')
        }

        const formatedData = this.formatLegalPersonData(data)
        const personResponse = await this.api.createLegalPerson(formatedData)

        personModel = await repository.create({
            document: document,
            request: formatedData,
            response: personResponse,
            data: undefined,
        })

        return await this.updateLegalPerson(personModel)
    }

    public async updateLegalPerson(naturalPerson: HydratedDocument<IOnboardingLegalPerson>) {
        const pendingStatus = [
            QITech.AnalysisStatus.IN_MANUAL_ANALYSIS,
            QITech.AnalysisStatus.IN_QUEUE,
            QITech.AnalysisStatus.NOT_ANALYSED,
            QITech.AnalysisStatus.PENDING,
        ]
        if (!naturalPerson.data || (naturalPerson.data && pendingStatus.includes(naturalPerson.data.analysis_status))) {
            const data = await this.api.getLegalPerson(naturalPerson.response.id)
            naturalPerson.data = data
            naturalPerson.markModified('data')
            await naturalPerson.save()
        }
        return naturalPerson
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
}
