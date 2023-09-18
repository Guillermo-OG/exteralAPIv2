import axios, { AxiosInstance } from 'axios'
import { createHash, createPrivateKey } from 'crypto'
import FormData from 'form-data'
import { JWTPayload, SignJWT, decodeJwt } from 'jose'
import { QiTechTypes } from './'
// import { IUpdate } from './types/Person.types'

interface IQiTechConfig {
    apiKey: string
    privateKey: string
    passphrase?: string
    baseUrl: string
    qiPublicKey: string
}

interface IHeaders {
    [attr: string]: string
}

interface ISignedMessage {
    headers: IHeaders
    body: IBody | null
}
interface IBody {
    encoded_body: string
}

export class QiTechClient {
    private readonly api: AxiosInstance
    private readonly config: IQiTechConfig

    constructor(config: IQiTechConfig) {
        this.api = axios.create({
            baseURL: config.baseUrl,
        })
        this.config = config
    }

    public async testRequest() {
        const endpoint = `/test/${this.config.apiKey}`
        const body = { name: 'QI Tech' }
        const contentType = 'application/json'

        const config = await this.signMessage(endpoint, 'POST', body, contentType)

        const res = await this.api.post(endpoint, config.body, { headers: config.headers })
        return await this.decodeMessage<string>(endpoint, 'POST', res.headers as IHeaders, res.data)
    }

    public async createAccount(data: QiTechTypes.Account.ICreate) {
        const endpoint = '/account'
        const body = data
        const contentType = 'application/json'
        const config = await this.signMessage(endpoint, 'POST', body, contentType)
        const res = await this.api.post(endpoint, config.body, { headers: config.headers })
        return await this.decodeMessage<QiTechTypes.Account.ICreateResponse>(endpoint, 'POST', res.headers as IHeaders, res.data)
    }

    // public async updateAccount(data: Partial<QiTechTypes.Account.IUpdate>) {
    //     const endpoint = '/account'
    //     const body = data
    //     const contentType = 'application/json'
    //     const config = await this.signMessage(endpoint, 'PATCH', body, contentType)
    //     const res = await this.api.patch(endpoint, config.body, { headers: config.headers })
    //     return await this.decodeMessage<QiTechTypes.Account.IUpdateResponse>(endpoint, 'PATCH', res.headers as IHeaders, res.data)
    // }

    public async listAccounts(
        document: string,
        page = 1,
        pageSize = 100
    ): Promise<QiTechTypes.Common.IPaginatedSearch<QiTechTypes.Account.IList>> {
        const urlQueryParams = new URLSearchParams({
            owner_document_number: document,
            page: page.toString(),
            pageSize: pageSize.toString(),
        })
        const endpoint = `/account?${urlQueryParams}`
        const contentType = 'application/json'
        const config = await this.signMessage(endpoint, 'GET', undefined, contentType)
        const res = await this.api.get(endpoint, { headers: config.headers })
        return await this.decodeMessage<QiTechTypes.Common.IPaginatedSearch<QiTechTypes.Account.IList>>(
            endpoint,
            'GET',
            res.headers,
            res.data
        )
    }

    public async listAllAccounts(page = 1, pageSize = 100): Promise<QiTechTypes.Common.IPaginatedSearch<QiTechTypes.Account.IList>> {
        const urlQueryParams = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString(),
        })
        const endpoint = `/account?${urlQueryParams}`
        const contentType = 'application/json'
        const config = await this.signMessage(endpoint, 'GET', undefined, contentType)
        const res = await this.api.get(endpoint, { headers: config.headers })
        return await this.decodeMessage<QiTechTypes.Common.IPaginatedSearch<QiTechTypes.Account.IList>>(
            endpoint,
            'GET',
            res.headers,
            res.data
        )
    }

    public async getAccountsByKey(
        accountKey: string,
        page = 1,
        pageSize = 100
    ): Promise<QiTechTypes.Common.IPaginatedSearch<QiTechTypes.Account.IList>> {
        const urlQueryParams = new URLSearchParams({
            account_key: accountKey,
            page: page.toString(),
            pageSize: pageSize.toString(),
        })
        const endpoint = `/account?${urlQueryParams}`
        const contentType = 'application/json'
        const config = await this.signMessage(endpoint, 'GET', undefined, contentType)
        const res = await this.api.get(endpoint, { headers: config.headers })
        return await this.decodeMessage<QiTechTypes.Common.IPaginatedSearch<QiTechTypes.Account.IList>>(
            endpoint,
            'GET',
            res.headers,
            res.data
        )
    }

    public async uploadFile(fileName: string, fileBuffer: Buffer): Promise<QiTechTypes.Upload.IResponse> {
        const endpoint = '/upload'
        const method = 'POST'
        const bodyToSign = fileBuffer.toString('binary')
        const contentType = ''

        const body = new FormData()
        body.append('file', fileBuffer, {
            filename: fileName,
        })

        const config = await this.signMessage(endpoint, method, bodyToSign, contentType, true)
        const res = await this.api.post(endpoint, body, { headers: config.headers })

        return await this.decodeMessage<QiTechTypes.Upload.IResponse>(endpoint, 'POST', res.headers as IHeaders, res.data)
    }

    private async signMessage(
        endpoint: string,
        method: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE',
        body?: unknown,
        contentType = '',
        isFile = false,
        customHeaders?: IHeaders
    ): Promise<ISignedMessage> {
        const privateKey = createPrivateKey({
            key: this.config.privateKey,
            format: 'pem',
            type: 'pkcs1',
            passphrase: this.config.passphrase || '',
            encoding: 'utf-8',
        })

        let md5Body = ''
        let requestBody = null

        if (body) {
            if (isFile) {
                md5Body = createHash('md5').update(body.toString(), 'binary').digest('hex')
            } else {
                const encoded_body_token = await new SignJWT(body as JWTPayload).setProtectedHeader({ alg: 'ES512' }).sign(privateKey)
                requestBody = { encoded_body: encoded_body_token }
                md5Body = createHash('md5').update(encoded_body_token).digest('hex')
            }
        }
        const date = new Date().toUTCString()
        const stringToSign = method + '\n' + md5Body + '\n' + contentType + '\n' + date + '\n' + endpoint

        const headers = { alg: 'ES512', typ: 'JWT' }
        const claims = { sub: this.config.apiKey, signature: stringToSign }

        const encodedHeaderToken = await new SignJWT(claims)
            .setProtectedHeader({ alg: 'ES512' })
            .setProtectedHeader(headers)
            .sign(privateKey)

        const authorization = 'QIT' + ' ' + this.config.apiKey + ':' + encodedHeaderToken

        let requestHeader = { AUTHORIZATION: authorization, 'API-CLIENT-KEY': this.config.apiKey }

        if (customHeaders) {
            requestHeader = {
                ...requestHeader,
                ...customHeaders,
            }
        }

        return { headers: requestHeader, body: requestBody }
    }

    public async decodeMessage<T>(
        endpoint: string,
        method: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE' | string,
        responseHeader: AxiosResponseHeaders | RawAxiosResponseHeaders,
        responseBody?: IBody
    ) {
        let body = null
        if (responseBody) {
            body = decodeJwt(responseBody['encoded_body'])
        }

        const authorization = responseHeader['authorization']
        const headerApiKey = responseHeader['api-client-key']

        if (headerApiKey !== this.config.apiKey) {
            throw new Error('A chave de API obtida no header da mensagem não corresponde à fornecida na função')
        }

        if (!authorization) {
            throw new Error('Autorização de resposta inválida')
        }

        const splitAuthorization = authorization.split(':')

        let authorizationApiKey = splitAuthorization[0].split(' ')[1]

        if (authorizationApiKey !== this.config.apiKey) {
            throw new Error('Formato incorreto para o Authorization header')
        }

        authorizationApiKey = splitAuthorization[0].split(' ')[1]
        if (authorizationApiKey !== this.config.apiKey) {
            throw new Error('A api_key obtida no cabeçalho de autorização da mensagem não corresponde à fornecida na função')
        }

        const headerToken = splitAuthorization[1]
        const decodedHeaderToken = decodeJwt(headerToken)

        const signature = decodedHeaderToken['signature']
        const splitSignature = (signature as string).split('\n')
        const signatureMethod = splitSignature[0]
        const signatureMD5Body = splitSignature[1]
        const signatureEndpoint = splitSignature[4]

        if (signatureEndpoint !== endpoint) {
            throw new Error('A api_key obtida no cabeçalho de autorização da mensagem não corresponde à fornecida na função')
        }

        if (signatureMethod !== method) {
            throw new Error('A api_key obtida no cabeçalho de autorização da mensagem não corresponde à fornecida na função')
        }

        if (responseBody) {
            const md5Body = createHash('md5').update(responseBody['encoded_body']).digest('hex')
            if (signatureMD5Body !== md5Body) {
                throw new Error('O parâmetro md5_body obtido na assinatura da mensagem não corresponde ao corpo fornecido na função')
            }
        }

        return body as T
    }

    public async createPixKey(data: ICreatePix): Promise<string> {
        const endpoint = '/baas/pix/keys'
        const contentType = 'application/json'
        const config = await this.signMessage(endpoint, 'POST', data, contentType)
        const res = await this.api.post(endpoint, config.body, { headers: config.headers })
        return this.decodeMessage<string>(endpoint, 'POST', res.headers as IHeaders, res.data)
    }

    public async cancelAccount(accountKey: string): Promise<string> {
        const endpoint = `/account/${accountKey}/cancel`
        const contentType = 'application/json'
        const config = await this.signMessage(endpoint, 'PATCH', null, contentType)
        const res = await this.api.patch(endpoint, null, { headers: config.headers })
        return await this.decodeMessage<string>(endpoint, 'PATCH', res.headers as IHeaders, res.data)
    }

    public async getLimitsByAccountKey(accountKey: string): Promise<QiTechTypes.Pix.IPixLimits> {
        const endpoint = `/baas/pix/limits/${accountKey}/usage`
        const contentType = 'application/json'
        const config = await this.signMessage(endpoint, 'GET', undefined, contentType)
        const res = await this.api.get(endpoint, { headers: config.headers })
        return await this.decodeMessage<QiTechTypes.Pix.IPixLimits>(endpoint, 'GET', res.headers as IHeaders, res.data)
    }

    public async updatePixLimits(accountKey: string, data: Partial<QiTechTypes.Pix.IPixLimits>) {
        const endpoint = `/baas/pix/limits/${accountKey}`
        const contentType = 'application/json'
        const config = await this.signMessage(endpoint, 'POST', data, contentType)

        const res = await this.api.post(endpoint, config.body, { headers: config.headers })
        return this.decodeMessage<string>(endpoint, 'POST', res.headers as IHeaders, res.data)
    }

    public async getPixLimitsRequest(accountKey: string, requestStatus: QiTechTypes.Pix.IPixRequestStatus, page = 1, pageSize = 10) {
        const urlQueryParams = new URLSearchParams({
            account_key: accountKey,
            request_status: requestStatus,
            page: page.toString(),
            page_size: pageSize.toString(),
        })
        const endpoint = `/baas/pix/limits_request?${urlQueryParams}`
        const contentType = 'application/json'
        const config = await this.signMessage(endpoint, 'GET', undefined, contentType)

        const res = await this.api.get(endpoint, { headers: config.headers })
        return await this.decodeMessage<QiTechTypes.Common.IPaginatedSearch<QiTechTypes.Pix.IPixLimitUpdateRequest>>(
            endpoint,
            'GET',
            res.headers as IHeaders,
            res.data
        )
    }

    public async requestToken(updateObject: QiTechTypes.Person.IUpdate) {
        const endpoint = '/baas/token_request'
        const body = updateObject
        const contentType = 'application/json'

        const config = await this.signMessage(endpoint, 'POST', body, contentType)
        const res = await this.api.post(endpoint, config.body, { headers: config.headers })

        return await this.decodeMessage<object>(endpoint, 'POST', res.headers as IHeaders, res.data)
    }

    public async getBillingConfigurationByAccountKey(accountKey: string) {
        const endpoint = `/billing/${accountKey}/billing_configuration`
        const contentType = 'application/json'
        const config = await this.signMessage(endpoint, 'GET', undefined, contentType)

        const res = await this.api.get(endpoint, { headers: config.headers })
        return await this.decodeMessage<object>(endpoint, 'GET', res.headers as IHeaders, res.data)
    }

    public async updateBillingConfigurationByAccountKey(
        accountKey: string,
        data: QiTechTypes.BillingConfiguration.IBillingConfigurationResponse
    ) {
        const endpoint = `/baas/billing/${accountKey}/billing_configuration`
        const contentType = 'application/json'
        const config = await this.signMessage(endpoint, 'PUT', data, contentType)

        const res = await this.api.put(endpoint, config.body, { headers: config.headers })
        return await this.decodeMessage<QiTechTypes.BillingConfiguration.IBillingConfigurationResponse>(
            endpoint,
            'PUT',
            res.headers as IHeaders,
            res.data
        )
    }
}
