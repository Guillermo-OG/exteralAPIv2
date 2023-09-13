import { ServerError } from './ServerError'

export class UnauthorizedError extends ServerError {
    public readonly status = 401

    constructor(message = 'Credenciais inválidas.') {
        super(message)
        this.name = 'UnauthorizedError'
    }
}
