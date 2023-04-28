import { ServerError } from './ServerError'

export class ValidationError extends ServerError {
    public readonly status = 400

    constructor(message: string) {
        super(message)
        this.name = 'ValidationError'
    }
}
