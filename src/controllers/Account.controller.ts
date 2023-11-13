import { NextFunction, Request, Response } from 'express'
import { AccountStatus, NotFoundError, ValidationError } from '../models'
import { AccountRepository, FileRepository } from '../repository'
import { QiTechService } from '../services'
import { unMask } from '../utils/masks'

export class AccountController {
    public async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            const document = req.body?.account_owner?.individual_document_number || req.body?.account_owner?.company_document_number
            if (!document) {
                throw new ValidationError('Documento ausente')
            }

            const response = await qiTechService.createAccount(document, req.body, req.user)
            res.json(response)
        } catch (error) {
            next(await qiTechService.decodeError(error))
        }
    }

    public async getByDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const document = unMask(req.params.document)
            const account = await AccountRepository.getInstance().eagerGetByDocument(document)
            if (!account) {
                throw new NotFoundError('Conta n�o encontrada para este documento')
            }

            res.json(account)
        } catch (error) {
            next(error)
        }
    }

    public async List(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const page = Number(req.query.page ?? '1')
            const status = (req.query.status as AccountStatus) || undefined
            const document = (req.query.status as string) || undefined
            const accounts = AccountRepository.getInstance().list(page, document, status)

            res.json(accounts)
        } catch (error) {
            next(error)
        }
    }

    public async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            const { file, body } = req
            if (!file) {
                throw new ValidationError('Arquivo não encontrado')
            }

            const fileModel = await qiTechService.uploadFile(unMask(body.document), body.type, file.originalname || 'file.pdf', file.buffer)

            res.json(fileModel)
        } catch (error) {
            next(await qiTechService.decodeError(error))
        }
    }

    public async listFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { page, document = '', type } = req.query

            const files = await FileRepository.getInstance().list(parseInt(page as string), unMask(document as string), type as string)

            res.json(files)
        } catch (error) {
            next(error)
        }
    }

    public async handleListAllAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const page = Number(req.query.page) || 1
            const pageSize = Number(req.query.pageSize) || 100
            const document = req.query.document as string | undefined // novo parâmetro
            const accountNumber = req.query.account_number as string | undefined // novo parâmetro

            const accounts = await QiTechService.getInstance().listAllAccounts(page, pageSize, document, accountNumber) // passar novos argumentos
            res.status(200).json(accounts)
        } catch (error) {
            next(error)
        }
    }

    // public async handleListAllAccountsWithPixLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
    //     try {
    //         const page = Number(req.query.page) || 1
    //         const pageSize = Number(req.query.pageSize) || 100

    //         const accounts = await QiTechService.getInstance().listAllAccountsWithPixLimits(page, pageSize)

    //         res.status(200).json(accounts)
    //     } catch (error) {
    //         next(error)
    //     }
    // }

    public async getByAccountKeyFromQITech(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const account_key = req.params.accountKey
            const accounts = await QiTechService.getInstance().getAccountQITech(account_key)
            res.status(200).json(accounts)
        } catch (error) {
            next(error)
        }
    }

    public async cancelAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            const accountKey = req.params.accountKey
            if (!accountKey) {
                throw new ValidationError('Chave da conta ausente')
            }
            const response = await qiTechService.cancelAccount(accountKey)
            res.status(200).json(response)
        } catch (error) {
            next(await qiTechService.decodeError(error))
        }
    }

    public async updatePhoneNumber(req: Request, res: Response, next: NextFunction): Promise<void> {
        const qiTechService = QiTechService.getInstance()
        try {
            const { document } = req.params
            const { phone_number } = req.body
            const { email } = req.body

            const response = await qiTechService.updatePhoneNumber(document, phone_number, email)

            res.json(response)
        } catch (error) {
            next(await qiTechService.decodeError(error))
        }
    }
}
