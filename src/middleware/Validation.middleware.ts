import { NextFunction, Request, Response } from 'express'
import { Schema } from 'yup'
import { unMask } from '../utils/masks'
import { AccountType } from '../models'
export interface ISchemas {
    body?: Schema
    query?: Schema
}

export interface ISchemaAccount {
    [AccountType.PF]: Schema
    [AccountType.PJ]: Schema
}
export class ValidationMiddleware {
    public validate(schemas: ISchemas, account?: ISchemaAccount) {
        return async (req: Request, _res: Response, next: NextFunction) => {
            try {
                const { body, query } = schemas
                if (body || account) {
                    if (account) {
                        const document = req.body.cpfCnpj || req.body.account_owner.company_document_number
                        const accountType = unMask(document).length === 11 ? AccountType.PF : AccountType.PJ
                        await account[accountType].validate(req.body, {
                            abortEarly: false,
                        })
                    } else if(body) {
                        await body.validate(req.body, {
                            abortEarly: false,
                        })
                    }
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
