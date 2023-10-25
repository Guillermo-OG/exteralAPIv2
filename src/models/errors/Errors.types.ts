export interface ErrorDetails {
    requestBody?: unknown
    attemptedUrl?: string
    [key: string]: unknown // permite propriedades adicionais
}
