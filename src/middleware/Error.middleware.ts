import { AxiosError } from 'axios'
import { NextFunction, Request, Response } from 'express'
import { ValidationError } from 'yup'
import { ServerError } from '../models/errors'
import { parseError } from '../utils/schemas'

export class ErrorMiddleware {
    public handler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
        if (res.headersSent) {
            return next(err)
        }

        let status = 500
        let response: unknown = { message: 'Server Error' }

        //* Abstract handler for errors
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
            status = 400
            response = {
                error: 'Unexpected API Error',
                details: err.response?.data,
            }
        }
        res.status(status).json(response)
    }
}
