import { ServerError } from './ServerError'

export class UnauthorizedError extends ServerError {
    public readonly status = 401

    constructor(message = 'Invalid credentials') {
        super(message)
        this.name = 'UnauthorizedError'
    }
}
