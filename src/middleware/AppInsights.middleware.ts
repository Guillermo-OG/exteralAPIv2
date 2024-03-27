import { NextFunction, Request, Response } from 'express'
import { TelemetryClient } from 'applicationinsights'

export class AppInsightsMiddleware {
    public handler(req: Request, res: Response, next: NextFunction): void {
        const appInsightsClient: TelemetryClient = req.app.locals.appInsightsClient

        res.on('finish', () => {
            const { method, path, body, headers } = req
            const { statusCode } = res

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
        })

        next()
    }
}
