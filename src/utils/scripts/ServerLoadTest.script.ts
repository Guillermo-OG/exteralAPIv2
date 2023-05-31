import axios, { AxiosError } from 'axios'
import { v4 } from 'uuid'

async function loadTest() {
    let success = 0,
        error = 0
    const total = 5000
    const start = new Date().getTime()
    const api = axios.create({
        baseURL: 'http://localhost:3000',
        headers: {
            Authorization:
                'Basic M2JlOWE5YmMtYzlhMy00NGY2LWIzMGMtMGIyMzBhYjhlYTJlOjY1MzMzMDM2MzczODMxNjMyZDM2NjU2NTMzMmQzNDY1Mzg2NjJkMzk2MTY2MzYyZDYzMzMzMzM2MzkzNjM5NjEzMjMxNjIzMg==',
        },
    })

    async function compute(payload: unknown): Promise<boolean> {
        try {
            await api.post('/onboarding/natural_person', payload)
            return true
        } catch (error) {
            if (error instanceof AxiosError) console.log(error.response?.data)
            return false
        }
    }

    const promises: Promise<boolean>[] = []

    for (let index = 0; index < total; index++) {
        const payload = {
            name: 'John Sample' + index,
            document_number: v4(),
            birthdate: '1992-09-15',
            mother_name: 'Maria Sample',
        }
        promises.push(compute(payload))
    }
    const responses = await Promise.all(promises)

    for (const iterator of responses) {
        if (iterator) {
            success++
        } else {
            error++
        }
    }

    console.log(`Started Test for ${total} requests`)
    console.log(`Finished in ${(new Date().getTime() - start) / 1000}s`)
    console.log(`Success: ${success} (${Math.round((success / total) * 100)})`)
    console.log(`Errors: ${error} (${Math.round((error / total) * 100)})`)
    console.log(`Total: ${total}`)

    return
}

loadTest()
