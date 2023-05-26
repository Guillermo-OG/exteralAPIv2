import { unMask } from './masks'

export function areaCodeAndNumberFromPhone(phone?: string): { number: string; areaCode: string; countryCode: string } | undefined {
    if(!phone) {
        return
    }
    phone = unMask(phone)
    const pattern = /^(\d{2})(\d{9})$/
    const match = phone.match(pattern)
    if (match) {
        const areaCode = match[1]
        const number = match[2]
        return { areaCode, number, countryCode: '55' }
    } else {
        return
    }
}
