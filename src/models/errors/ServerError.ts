export abstract class ServerError extends Error {
    abstract status: number

    constructor(message = 'Server Error') {
        super(message)
    }
}
