/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express'
import { TelemetryClient } from 'applicationinsights'
import { DependencyTelemetry } from 'applicationinsights/out/Declarations/Contracts/TelemetryTypes/DependencyTelemetry'

export class AppInsightsMiddleware {
    constructor() {
        this.handler = this.handler.bind(this)
    }

    public handler(req: Request, res: Response, next: NextFunction): void {
        const appInsightsClient: TelemetryClient = req.app.locals.appInsightsClient
        const start = process.hrtime()

        res.on('finish', () => {
            const { method, path, body, headers } = req
            const { statusCode } = res
            const end = process.hrtime(start)
            const duration = Math.round(end[0] * 1000 + end[1] / 1000000)

            appInsightsClient.trackRequest({
                name: `${method} ${path}`,
                resultCode: statusCode,
                success: true,
                url: req.url,
                duration: 0,
                properties: {
                    customRequestBody: JSON.stringify(body),
                    customRequestHeaders: JSON.stringify(headers),
                    customResponseHeaders: JSON.stringify(res.getHeaders()),
                    customResponseStatus: JSON.stringify(statusCode),
                },
            })

            this.trackDependencyWithCustomProperties(appInsightsClient, method, path, duration, statusCode, body, headers, res)
        })

        next()
    }

    private trackDependencyWithCustomProperties(
        appInsightsClient: TelemetryClient,
        method: string,
        path: string,
        duration: number,
        statusCode: number,
        body: any,
        headers: any,
        res: Response
    ): void {
        const dependencyTelemetry: DependencyTelemetry = {
            target: path,
            name: `${method} ${path}`,
            duration: duration,
            resultCode: statusCode,
            success: statusCode < 400,
            data: JSON.stringify(body),
            dependencyTypeName: 'HTTP',
            properties: {
                customRequestBody: JSON.stringify(body),
                customRequestHeaders: JSON.stringify(headers),
                customResponseHeaders: JSON.stringify(res.getHeaders()),
                customResponseStatus: JSON.stringify(statusCode),
            },
        }

        appInsightsClient.trackDependency(dependencyTelemetry)
    }
}
