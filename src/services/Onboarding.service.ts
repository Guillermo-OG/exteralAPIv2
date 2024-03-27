import { AxiosError } from 'axios'
import { createHmac } from 'crypto'
import { format } from 'date-fns'
import { Request } from 'express'
import { Schema } from 'mongoose'
import { v4 } from 'uuid'
import { ValidationError as YupValidationError } from 'yup'
import env from '../config/env'
import { OnboardingClient, OnboardingTypes, QiTechTypes } from '../infra'
import { IAccount, IOnboarding, NotFoundError, OnboardingModel, ServerError } from '../models'
import { AccountRepository, ApiUserRepository, OnboardingRepository } from '../repository'
import { maskCEP, maskCNPJ, maskCPF, unMask } from '../utils/masks'
import { formatJson } from '../utils/scripts/formatStringJson.script'
import { legalPersonSchema, naturalPersonSchema, parseError } from '../utils/schemas'
import { QiTechService } from './QiTech.service'
import { TelemetryClient } from 'applicationinsights'

export class OnboardingService {
    private static instance: OnboardingService
    private readonly api: OnboardingClient
    private readonly webhookSecret: string
    private readonly urlContaVBB: string

    private constructor() {
        if (!env.ONBOARDING_API_SECRET || !env.ONBOARDING_BASE_URL || !env.ONBOARDING_WEBHOOK_SECRET) {
            throw new Error('Faltam variáveis de ambiente qitech')
        }
        this.webhookSecret = env.ONBOARDING_WEBHOOK_SECRET
        this.urlContaVBB = env.ONBOARDING_WEBHOOK_URL_CONTA_VBB
        this.api = new OnboardingClient(env.ONBOARDING_BASE_URL, env.ONBOARDING_API_SECRET)
    }

    public static getInstance(): OnboardingService {
        if (!OnboardingService.instance) {
            OnboardingService.instance = new OnboardingService()
        }
        return OnboardingService.instance
    }

    public async createOnboardingVBB(data: QiTechTypes.Account.ICreate, accountId?: Schema.Types.ObjectId): Promise<OnboardingModel> {
        const qiTechService = QiTechService.getInstance()
        const external_id = data.external_id
        await qiTechService.formatPayload(data)
        const onboardingData = await this.mapQiTechPayload(data)
        const onboarding = await this.createOnboarding(onboardingData, accountId, 'vbb', external_id)

        return onboarding
    }

    public async createOnboarding(
        data: OnboardingTypes.INaturalPersonCreate | OnboardingTypes.ILegalPersonCreate,
        accountId?: Schema.Types.ObjectId,
        origin?: string,
        externalId?: string
    ): Promise<OnboardingModel> {
        const repository = OnboardingRepository.getInstance()
        const document = unMask(data.document_number)

        const onboardingModelData: IOnboarding = {
            document: document,
            request: data,
            response: undefined,
            data: undefined,
            status: OnboardingTypes.RequestStatus.PENDING,
            accountId: accountId,
            origin,
        }

        if (origin === 'vbb' && externalId) {
            onboardingModelData.externalId = externalId
        }

        let onboarding = await repository.getByDocument(document)
        if (onboarding) {
            if ([OnboardingTypes.RequestStatus.APPROVED, OnboardingTypes.RequestStatus.PENDING].includes(onboarding.status)) {
                return onboarding
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

        if (onboarding) {
            onboarding.request = onboardingModelData.request
            onboarding.response = onboardingModelData.response
            onboarding.data = onboardingModelData.data
            onboarding.status = onboardingModelData.status
            onboarding.error = onboardingModelData.error
            await onboarding.save()
        } else {
            onboarding = await repository.create(onboardingModelData)
        }

        return await this.updateOnboarding(onboarding)
    }

    public async getAnalysis(
        onboarding: OnboardingModel
    ): Promise<OnboardingTypes.ILegalPersonGetResponse | OnboardingTypes.INaturalPersonGetResponse> {
        try {
            let analysis: OnboardingTypes.ILegalPersonGetResponse | OnboardingTypes.INaturalPersonGetResponse

            if ('legal_name' in onboarding.request) {
                analysis = await this.api.getLegalPerson(onboarding.response?.id ?? '0')
            } else {
                analysis = await this.api.getNaturalPerson(onboarding.response?.id ?? '0')
            }

            return analysis
        } catch (error) {
            throw new Error('Erro ao obter análise')
        }
    }

    public async updateOnboarding(onboarding: OnboardingModel) {
        let updatedOB = onboarding
        console.log({ oldStatus: onboarding.status })
        if (onboarding.status === OnboardingTypes.RequestStatus.PENDING && onboarding.response) {
            await new Promise(resolve => setTimeout(resolve, 10000))
            let udaptedData: OnboardingTypes.ILegalPersonGetResponse | OnboardingTypes.INaturalPersonGetResponse
            if ('legal_name' in onboarding.request) {
                udaptedData = await this.api.getLegalPerson(onboarding.response.id)
            } else {
                udaptedData = await this.api.getNaturalPerson(onboarding.response.id)
            }
            const newStatus = this.mapQiTechStatusToVillelaStatus(udaptedData.analysis_status)
            console.log({ statusQiTech: udaptedData.analysis_status })
            if (onboarding.status !== newStatus || !onboarding.data) {
                onboarding.data = udaptedData
                onboarding.status = newStatus
                onboarding.markModified('data')
            }
        }

        if (onboarding.isModified()) {
            updatedOB = await onboarding.save()
        }

        return updatedOB
    }

    public authenticateWebhook(req: Request): void {
        const appInsightsClient: TelemetryClient = req.app.locals.appInsightsClient
        const signature = req.headers.signature as string // Assuming header exists and is a string
        const payloadBeforeFormat = req.body
        const payload = formatJson(req.body) // Convert object to JSON string
        const method = req.method
        const endpoint = req.protocol + 's://' + req.get('host') + req.originalUrl

        // const tempEndpoint = 'https://prd-ap1-q1-t3ch.azurewebsites.net/webhook/onboarding'
        const hash = createHmac('sha1', this.webhookSecret)
            .update(endpoint + method + payload)
            .digest('hex')

        if (hash !== signature) {
            appInsightsClient.trackTrace({
                message: 'Track do Onboarding não autorizado',
                severity: 3, // Error severity level
                properties: {
                    SignatureKey: this.webhookSecret,
                    'Payload Before Format': JSON.stringify(payloadBeforeFormat),
                    Payload: payload,
                    Method: method,
                    Endpoint: endpoint,
                    HashCriado: hash,
                    HashEsperadoHeader: signature,
                },
            })
            // throw new UnauthorizedError('Onboarding não autorizado')
        }
    }

    public async handleWebhook(data: OnboardingTypes.IWebhookBody) {
        const repository = OnboardingRepository.getInstance()
        let payload: unknown = null
        let url: string | null = null
        let onboarding: OnboardingModel | null = null
        let createdAccount: IAccount | null = null

        if (data.legal_person_id) {
            onboarding = await repository.getByResponseId(data.legal_person_id)
        } else if (data.natural_person_id) {
            onboarding = await repository.getByResponseId(data.natural_person_id)
        }

        if (onboarding) {
            payload = await this.updateOnboarding(onboarding)
            console.log({ afterupdate: payload })
            if (onboarding.origin?.toLowerCase() === 'vbb') {
                url = this.urlContaVBB
            } else {
                // url = legalPerson.webhookUrl
                url = 'http://localhost:3000/webhook/mock'

                // Verifique se o onboarding foi aprovado
                if (onboarding.status === OnboardingTypes.RequestStatus.APPROVED) {
                    createdAccount = await this.createAccountIfNecessary(onboarding)

                    if (!createdAccount) throw new Error('Conta não criada')

                    url = createdAccount.callbackURL
                }
            }
        }

        if (!payload || !url) {
            throw new NotFoundError('Onboarding não encontrado', { requestBody: data })
        }

        return {
            payload,
            url,
            createdAccount,
        }
    }

    private async createAccountIfNecessary(onboarding: OnboardingModel) {
        const document = unMask(onboarding.request.document_number)
        const account = await AccountRepository.getInstance().eagerGetByDocument(document)

        if (!account) {
            throw new Error('Conta não encontrada para o documento fornecido')
        }

        const payload = account.request as QiTechTypes.Account.ICreate

        const apiUserRepository = ApiUserRepository.getInstance()
        const apiUser = await apiUserRepository.getById(account.apiUserId)

        if (!apiUser) {
            throw new Error('usuário da API não encontrado para o apiUserId fornecido')
        }

        const qiTechService = QiTechService.getInstance()
        return await qiTechService.createAccountOnboardingOk(document, payload, account?.apiUserId)
    }

    public mapQiTechPayload(data: QiTechTypes.Account.ICreate): OnboardingTypes.INaturalPersonCreate | OnboardingTypes.ILegalPersonCreate {
        if ('company_document_number' in data.account_owner && data.allowed_user) {
            const owner = data.account_owner as QiTechTypes.Account.IOwnerPJ

            // Este map gostaria que seguisse a seguinte interfaace (deixando string vazia os que não tem)
            const partners = owner.company_representatives?.map(rep => ({
                name: rep.name,
                birthdate: rep.birth_date,
                nationality: rep.nationality.substring(0, 3).toUpperCase(),
                document_number: maskCPF(rep.individual_document_number),
                mother_name: rep.mother_name,
            }))

            return {
                foundation_date: owner.foundation_date,
                id: v4(),
                registration_date: this.formatDate(new Date(), true, true),
                registration_id: v4(),
                document_number: maskCNPJ(owner.company_document_number),
                address: {
                    neighborhood: owner.address.neighborhood,
                    number: owner.address.number,
                    street: owner.address.street,
                    complement: owner.address.complement,
                    city: owner.address.city,
                    postal_code: maskCEP(owner.address.postal_code),
                    validation_type: OnboardingTypes.AddressValidationType.VISIT,
                    country: 'BRA',
                    uf: owner.address.state,
                },
                legal_name: owner.name,
                trading_name: owner.trading_name,
                partners,
            }
        } else {
            const owner = data.account_owner as QiTechTypes.Account.IOwnerPF
            const faceObject = owner.face
                ? {
                    face: {
                        type: owner.face.type as OnboardingTypes.DocumentValidationType,
                        registration_key: owner.face.registration_key,
                    },
                }
                : {}
            return {
                birthdate: owner.birth_date,
                document_number: maskCPF(owner.individual_document_number),
                id: v4(),
                registration_date: this.formatDate(new Date(), true, true),
                registration_id: v4(),
                mother_name: owner.mother_name,
                name: owner.name,
                ...faceObject,
            }
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
        let response: { [attr: string]: unknown } = { message: 'Erro no servidor' }

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
                error: 'Erro de API inesperado: ' + (err.config?.baseURL || '') + (err.config?.url || ''),
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
