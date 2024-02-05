export interface IMessage {
    type?: string
    data?: object
    headers?: { [key: string]: string | string[] | undefined }
    user?: string
}
