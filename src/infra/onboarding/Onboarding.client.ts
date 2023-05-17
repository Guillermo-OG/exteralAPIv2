import axios, { AxiosInstance } from 'axios'
import {
    ILegalPersonCreate,
    ILegalPersonCreateResponse,
    ILegalPersonGetResponse,
    INaturalPersonCreate,
    INaturalPersonCreateResponse,
    INaturalPersonGetResponse,
} from './Onboarding.types'

export class OnboardingClient {
    private readonly secret: string
    private readonly api: AxiosInstance

    constructor(baseUrl: string, secret: string) {
        this.secret = secret
        this.api = axios.create({
            baseURL: baseUrl,
            headers: {
                Authorization: this.secret,
            },
        })
    }

    public async createNaturalPerson(body: INaturalPersonCreate): Promise<INaturalPersonCreateResponse> {
        return (await this.api.post<INaturalPersonCreateResponse>('/onboarding/natural_person?analyze=true', body)).data
    }

    public async getNaturalPerson(id: string): Promise<INaturalPersonGetResponse> {
        return (await this.api.get<INaturalPersonGetResponse>(`/onboarding/natural_person/${id}`)).data
    }

    public async createLegalPerson(body: ILegalPersonCreate): Promise<ILegalPersonCreateResponse> {
        return (await this.api.post<ILegalPersonCreateResponse>('/onboarding/legal_person?analyze=true', body)).data
    }

    public async getLegalPerson(id: string): Promise<ILegalPersonGetResponse> {
        return (await this.api.get<ILegalPersonGetResponse>(`/onboarding/legal_person/${id}`)).data
    }
}
