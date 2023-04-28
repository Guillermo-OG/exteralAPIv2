import { NextFunction, Request, Response } from 'express'
import { Schema } from 'yup'

class ValidationMiddleware {
    public validate(schema: Schema) {
        return async (req: Request, _res: Response, next: NextFunction) => {
            try {
                await schema.validate(req.body, {
                    abortEarly: false,
                })
                next()
            } catch (error) {
                next(error)
            }
        }
    }
}

export const validationMiddleware = new ValidationMiddleware()
