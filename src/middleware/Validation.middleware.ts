import { NextFunction, Request, Response } from 'express'
import { Schema } from 'yup'
export interface ISchemas {
    body?: Schema
    query?: Schema
}

export class ValidationMiddleware {
    public validate(schemas: ISchemas) {
        return async (req: Request, _res: Response, next: NextFunction) => {
            try {
                const { body, query } = schemas
                if (body) {
                    await body.validate(req.body, {
                        abortEarly: false,
                    })
                }
                if (query) {
                    await query.validate(req.query, {
                        abortEarly: false,
                    })
                }
                next()
            } catch (error) {
                next(error)
            }
        }
    }
}
