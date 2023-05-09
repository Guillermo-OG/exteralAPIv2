export function validateCPF(cpf?: string): boolean {
    if (!cpf) {
        return false
    }

    cpf = cpf.replace(/[^\d]/g, '') // remove any non-digits
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
        return false // CPF must have exactly 11 digits and not be all the same digit
    }
    const digits = cpf.split('').map(digit => parseInt(digit))
    const sum1 = digits.slice(0, 9).reduce((sum, digit, i) => sum + digit * (10 - i), 0)
    const digit1 = sum1 % 11 < 2 ? 0 : 11 - (sum1 % 11)
    const sum2 = digits.slice(0, 10).reduce((sum, digit, i) => sum + digit * (11 - i), 0)
    const digit2 = sum2 % 11 < 2 ? 0 : 11 - (sum2 % 11)
    return digit1 === digits[9] && digit2 === digits[10]
}

export function validateCNPJ(cnpj?: string): boolean {
    if (!cnpj) {
        return false
    }
    // Remove any non-numeric characters
    cnpj = cnpj.replace(/\D/g, '')

    // Check if the CNPJ has 14 digits
    if (cnpj.length !== 14) {
        return false
    }

    // Calculate the first validation digit
    let sum = 0
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cnpj[i]) * (i < 4 ? 5 - i : 13 - i)
    }
    const firstValidationDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)

    // Calculate the second validation digit
    sum = 0
    for (let i = 0; i < 13; i++) {
        sum += parseInt(cnpj[i]) * (i < 5 ? 6 - i : 14 - i)
    }
    const secondValidationDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)

    // Check if the CNPJ is valid
    return parseInt(cnpj[12]) === firstValidationDigit && parseInt(cnpj[13]) === secondValidationDigit
}

export function validateIPv4(ip: string): boolean {
    // check that the address contains only digits and dots
    if (!/^\d+(\.\d+){3}$/.test(ip)) {
        return false
    }

    // split the address into its four octets
    const octets = ip.split('.')

    // check that there are four octets
    if (octets.length !== 4) {
        return false
    }

    // check that each octet is a number between 0 and 255
    for (const octet of octets) {
        const num = Number(octet)
        if (isNaN(num) || num < 0 || num > 255) {
            return false
        }
    }

    // if all checks pass, return true
    return true
}
