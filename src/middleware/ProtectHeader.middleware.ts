import { NextFunction, Request, Response } from 'express'

export class ProtectHeaderMiddleware {
    public handler(req: Request, _res: Response, next: NextFunction): void {
        // Se o header 'content-type' estiver ausente, assuma 'application/json'
        if (req.path === '/webhook/onboarding') {
            if (!req.headers['content-type']) {
                req.headers['content-type'] = 'application/json'
            }
        }
        next()
    }
}
