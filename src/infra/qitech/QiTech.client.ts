import axios, { AxiosInstance } from 'axios'
import { createHash, createPrivateKey } from 'crypto'
import FormData from 'form-data'
import { IncomingHttpHeaders } from 'http'
import { JWTPayload, SignJWT, decodeJwt } from 'jose'
import { QiTechTypes } from './'

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

    public async createAccount(data: any) {
        const endpoint = '/account'
        const body = data
        const contentType = 'application/json'
        const config = await this.signMessage(endpoint, 'POST', body, contentType)
        const res = await this.api.post(endpoint, config.body, { headers: config.headers })
        return await this.decodeMessage<string>(endpoint, 'POST', res.headers as IHeaders, res.data)
    }

    public async getAccount(document: string): Promise<any> {
        const endpoint = `/account?account_number=5395909&owner_document_number=${document}&page=1&page_size=10`
        const contentType = 'application/json'
        const config = await this.signMessage(endpoint, 'GET', undefined, contentType)
        const res = await this.api.get(endpoint, { headers: config.headers })
        return await this.decodeMessage<string>(endpoint, 'GET', res.headers as IHeaders, res.data)
    }

    public async uploadFile(fileName: string, fileBuffer: Buffer): Promise<QiTechTypes.Upload.IResponse> {
        const endpoint = '/upload'
        const method = 'POST'
        const bodyToSign = fileBuffer.toString('binary')
        const contentType = 'application/json'

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
        console.log('==========Signing Message===========')
        console.log('endpoint', endpoint)
        console.log('method', method)
        // console.log('body', body)

        const date = new Date().toUTCString()

        if (body) {
            if (isFile) {
                md5Body = createHash('md5').update(JSON.stringify(body), 'binary').digest('hex')
                requestBody = null
            } else {
                const encoded_body_token = await new SignJWT(body as JWTPayload).setProtectedHeader({ alg: 'ES512' }).sign(privateKey)
                requestBody = { encoded_body: encoded_body_token }
                md5Body = createHash('md5').update(encoded_body_token).digest('hex')
            }
        }

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

        console.log('==========Signed Output===========')
        console.log({ headers: requestHeader, body: requestBody })

        return { headers: requestHeader, body: requestBody }
    }

    public async decodeMessage<T>(
        endpoint: string,
        method: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE',
        responseHeader: IncomingHttpHeaders,
        responseBody?: IBody
    ) {
        let body = null
        if (responseBody) {
            body = decodeJwt(responseBody['encoded_body'])
        }

        const authorization = responseHeader['authorization']
        const headerApiKey = responseHeader['api-client-key']

        if (headerApiKey !== this.config.apiKey) {
            throw new Error('The api_key gathered on message header does not match the one provided to the function')
        }

        if (!authorization) {
            throw new Error('Invalid response authorization')
        }

        const splitAuthorization = authorization.split(':')

        let authorizationApiKey = splitAuthorization[0].split(' ')[1]

        if (authorizationApiKey !== this.config.apiKey) {
            throw new Error('Wrong format for the Authorization header')
        }

        authorizationApiKey = splitAuthorization[0].split(' ')[1]
        if (authorizationApiKey !== this.config.apiKey) {
            throw new Error('The api_key gathered on message authorization header does not match the one provided to the function')
        }

        const headerToken = splitAuthorization[1]
        const decodedHeaderToken = decodeJwt(headerToken)

        const signature = decodedHeaderToken['signature']
        const splitSignature = (signature as string).split('\n')
        const signatureMethod = splitSignature[0]
        const signatureMD5Body = splitSignature[1]
        const signatureEndpoint = splitSignature[4]

        if (signatureEndpoint !== endpoint) {
            throw new Error('The api_key gathered on message authorization header does not match the one provided to the function')
        }

        if (signatureMethod !== method) {
            throw new Error('The api_key gathered on message authorization header does not match the one provided to the function')
        }

        if (responseBody) {
            const md5Body = createHash('md5').update(responseBody['encoded_body']).digest('hex')
            if (signatureMD5Body !== md5Body) {
                throw new Error('The md5_body parameter gathered on message signature does not match the body provided to the function')
            }
        }

        return body as T
    }
}
