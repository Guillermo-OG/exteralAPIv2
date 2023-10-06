import { AxiosError } from 'axios'
import { NextFunction, Request, Response } from 'express'
import { ValidationError } from 'yup'
import { ServerError } from '../models/errors'
import { parseError } from '../utils/schemas'
import { TelemetryClient } from 'applicationinsights'

export class ErrorMiddleware {
    public handler(err: unknown, req: Request, res: Response, next: NextFunction): void {
        const appInsightsClient: TelemetryClient = req.app.locals.appInsightsClient

        if (res.headersSent) {
            return next(err)
        }

        let status = 500
        let response: unknown = { message: 'Server Error' }

        // Abstract handler for errors
        if (err instanceof ServerError) {
            status = err.status || status
            response = { error: err.name, message: err.message }
        } else if (err instanceof ValidationError) {
            const parsedErrors = parseError(err)
            status = 400
            response = {
                error: err.name,
                details: parsedErrors,
            }
        } else if (err instanceof AxiosError) {
            status = 500
            response = {
                error: 'Unexpected API Error',
                details: err.response?.data,
            }
        } else {
            console.log("Erro desconhecido:", err)
        }

        // Log the exception in Application Insights
        appInsightsClient.trackException({
            exception: new Error(err as string),
            properties: {
                name: JSON.stringify(req.path), 
                requestBody: JSON.stringify(req.body),
                responseBody: JSON.stringify(response || {}),
                statusCode: res.statusCode.toString()
            },
        })

        appInsightsClient.trackRequest({
            name: req.path,
            resultCode: status,
            success: status <= 400,
            url: req.url,
            duration: 300, 
            properties: {
                requestBody: JSON.stringify(req.body),
                responseBody: JSON.stringify(response || {}),
            },
        })

        appInsightsClient.trackTrace({
            message: 'Request and Response Details',
            properties: {
                requestPath: req.path,
                requestStatus: status,
                requestBody: JSON.stringify(req.body),
                requestHeaders: JSON.stringify(req.headers),
                responseBody: JSON.stringify(response || {}),
                responseHeaders: JSON.stringify(res.getHeaders()),
            },
        })

        res.status(status).json(response)
    }
}
