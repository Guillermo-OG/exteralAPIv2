import { HydratedDocument } from 'mongoose'
import { v4 } from 'uuid'
import env from '../config/env'
import { QITech, QiTechClient } from '../infra'
import { IOnboardingLegalPerson, IOnboardingNaturalPerson, ValidationError } from '../models'
import { OnboardingLegalPersonRepository, OnboardingNaturalPersonRepository } from '../repository'

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

        let personModel = await repository.getByDocument(document)
        if (personModel) {
            throw new ValidationError('Found existing onboarding for this document')
        }

        data.id = v4()
        data.registration_id = v4()
        const personResponse = await this.api.createNaturalPerson(data)

        personModel = await repository.create({
            document: document,
            request: data,
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
        let personModel = await repository.getByDocument(document)
        if (personModel) {
            throw new ValidationError('Found existing onboarding for this document')
        }

        data.id = v4()
        data.registration_id = v4()
        const personResponse = await this.api.createLegalPerson(data)

        personModel = await repository.create({
            document: document,
            request: data,
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

    // private formatDocument(document: string): string {
    //     const rawDoc = document.replace(/\D/g, '')
    //     if (rawDoc.length === 11) {
    //         return rawDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    //     } else if (rawDoc.length === 14) {
    //         return rawDoc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    //     }
    //     return document
    // }

    // private formatMoney(money: number): number {
    //     return Math.round(money)
    // }

    // private formatDate(date: string, dateTime = false, timeZone = false): string {
    //     const d = new Date(date)
    //     if (!dateTime) {
    //         return format(d, 'yyyy-MM-dd')
    //     }
    //     if (timeZone) {
    //         // eslint-disable-next-line quotes
    //         return format(d, "yyyy-MM-dd'T'hh:mm:ss.sssXXX")
    //     }
    //     // eslint-disable-next-line quotes
    //     return format(d, "yyyy-MM-dd'T'hh:mm:ss.sss'Z'")
    // }

    // private formatIp(ip: string): string {
    //     const rawIp = ip.replace(/\D/, '')
    //     return rawIp.replace(/(\d{1,3})(\d{1,3})(\d{1,3})(\d{1,3})/, '$1.$2.$3.$4')
    // }
}
