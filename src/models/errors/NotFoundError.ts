import { ServerError } from './ServerError'
import { ErrorDetails } from './Errors.types'

export class NotFoundError extends ServerError {
    public readonly status = 404

    constructor(message: string, details?: ErrorDetails) {
        super(message, details)
        this.name = 'NotFoundError'
    }
}
