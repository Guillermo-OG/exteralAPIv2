import { ServerError } from './ServerError'

export class NotFoundError extends ServerError {
    public readonly status = 404

    constructor(message: string) {
        super(message)
        this.name = 'NotFoundError'
    }
}
