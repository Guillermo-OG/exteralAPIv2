import { NextFunction, Request, Response } from 'express'
import { TelemetryClient } from 'applicationinsights'
import { PassThrough } from 'stream'

export class AppInsightsMiddleware {
    public handler(req: Request, res: Response, next: NextFunction): void {
        const appInsightsClient: TelemetryClient = req.app.locals.appInsightsClient

        // Initialize empty string to hold the response body
        let responseBody = ''

        // Create a pass-through stream and initialize it
        const passThrough = new PassThrough()
        res.pipe(passThrough)

        // Collect the data chunks in the responseBody variable
        passThrough.on('data', chunk => {
            responseBody += chunk.toString()
        })

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
                    customResponseBody: responseBody, // Add the captured response body here
                },
            })
        })

        next()
    }
}
