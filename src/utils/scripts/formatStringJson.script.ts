/* eslint-disable @typescript-eslint/no-explicit-any */

export function formatJson(jsonObj: object) {
    let formatted = '{'
    const entries = Object.entries(jsonObj)
    entries.forEach(([key, value], index) => {
        formatted += `"${key}": `
        if (typeof value === 'string') {
            formatted += `"${value}"`
        } else {
            formatted += `${value}`
        }
        if (index !== entries.length - 1) {
            formatted += ', '
        }
    })
    formatted += '}'
    return formatted
}
