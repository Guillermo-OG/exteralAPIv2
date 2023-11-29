import { NextFunction, Request, Response } from 'express'
import { Schema } from 'yup'
export interface ISchemas {
    body?: Schema
    query?: Schema
    context?: IValidationContext
}

interface IValidationContext {
    isTokenRequired: boolean
}

export class ValidationMiddleware {
    public validate(schemas: ISchemas) {
        return async (req: Request, _res: Response, next: NextFunction) => {
            try {
                const { body, query, context } = schemas
                if (body) {
                    await body.validate(req.body, {
                        abortEarly: false,
                        context: context,
                    })
                }
                if (query) {
                    await query.validate(req.query, {
                        abortEarly: false,
                        context: context,
                    })
                }
                next()
            } catch (error) {
                next(error)
            }
        }
    }
}
