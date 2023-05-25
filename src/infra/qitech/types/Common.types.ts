export interface ISignedResponse {
    encoded_body: string
}

export interface IPaginatedSearch<T> {
    data: T[]
    pagination: {
        current_page: number
        next_page: boolean | null
        rows_per_page: number
        total_pages: number
        total_rows: number
    }
}

export interface IWebhook {
    webhook_type: string
}
