import { NextFunction, Request, Response } from 'express'
import { PersonService } from '../services'
import { QiTechTypes } from '../infra'

export class PersonController {
    public async createPersonTokenRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
        const personService = PersonService.getInstance()
        try {
            const payload: QiTechTypes.Person.IPersonCreateRequest = req.body

            const result = await personService.handleCreatePersonTokenRequest(payload)
            res.json(result)
        } catch (error) {
            next(await personService.decodeError(error))
        }
    }

    public async validatePersonToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        const personService = PersonService.getInstance()
        try {
            const payload: QiTechTypes.Person.IPersonCreateValidate = req.body
            const result = await personService.handleValidatePersonToken(payload)
            res.json(result)
        } catch (error) {
            next(await personService.decodeError(error))
        }
    }

    public async createPersonLinkTokenRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
        const personService = PersonService.getInstance()
        try {
            const payload: QiTechTypes.Person.IProfessionalCreateRequest = req.body
            const result = await personService.handleCreatePersonLinkTokenRequest(payload)
            res.json(result)
        } catch (error) {
            next(await personService.decodeError(error))
        }
    }

    public async validatePersonLinkToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        const personService = PersonService.getInstance()
        try {
            const payload: QiTechTypes.Person.IProfessionalCreateValidate = req.body
            const result = await personService.handleValidatePersonLinkToken(payload)
            res.json(result)
        } catch (error) {
            next(await personService.decodeError(error))
        }
    }

    public async deletePersonLinkTokenRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
        const personService = PersonService.getInstance()
        try {
            const payload: QiTechTypes.Person.IProfessionalDeleteRequest = req.body
            const result = await personService.handleDeletePersonLinkTokenRequest(payload)
            res.json(result)
        } catch (error) {
            next(await personService.decodeError(error))
        }
    }

    public async validateDeletePersonLinkToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        const personService = PersonService.getInstance()
        try {
            const payload: QiTechTypes.Person.IProfessionalDeleteValidate = req.body
            const result = await personService.handleValidateDeletePersonLinkToken(payload)
            res.json(result)
        } catch (error) {
            next(await personService.decodeError(error))
        }
    }

    public async updateProfessionalDataContactTokenRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
        const personService = PersonService.getInstance()
        try {
            const payload: QiTechTypes.Person.IProfessionalDataContactUpdateRequest = req.body

            const result = await personService.handleUpdateProfessionalDataContactTokenRequest(payload)
            res.json(result)
        } catch (error) {
            next(await personService.decodeError(error))
        }
    }

    public async validateProfessionalUpdateDataContactToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        const personService = PersonService.getInstance()
        try {
            const payload: QiTechTypes.Person.IProfessionalDataContactUpdateValidate = req.body

            const result = await personService.handleValidateProfessionalUpdateDataContactToken(payload)
            res.json(result)
        } catch (error) {
            next(await personService.decodeError(error))
        }
    }
    public async updatePersonDataContactTokenRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
        const personService = PersonService.getInstance()
        try {
            const payload: QiTechTypes.Person.IPersonDataContactUpdateRequest = req.body

            const result = await personService.handleUpdatePersonDataContactTokenRequest(payload)
            res.json(result)
        } catch (error) {
            next(await personService.decodeError(error))
        }
    }

    public async validatePersonUpdateDataContactToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        const personService = PersonService.getInstance()
        try {
            const payload: QiTechTypes.Person.IPersonDataContactUpdateValidate = req.body

            const result = await personService.handleValidatePersonUpdateDataContactToken(payload)
            res.json(result)
        } catch (error) {
            next(await personService.decodeError(error))
        }
    }
}
