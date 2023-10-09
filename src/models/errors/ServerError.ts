import { ErrorDetails } from './Errors.types'

export abstract class ServerError extends Error {
    abstract status: number
    public details?: ErrorDetails
    
    constructor(message = 'ServerError', details?: ErrorDetails) {
        super(message)
        this.details = details
    }
}
