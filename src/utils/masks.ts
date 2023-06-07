export function unMask(value: string | number): string {
    return value.toString().replace(/\D/g, '')
}

export function maskCPF(value: string | number): string {
    const rawValue = unMask(value).padStart(11, '0').slice(0, 11)
    return rawValue.replace(/(^\d{3})(\d{3})(\d{3})(\d{2}$)/, '$1.$2.$3-$4')
}

export function maskCNPJ(value: string | number): string {
    const rawValue = unMask(value).padStart(14, '0').slice(0, 14)
    return rawValue.replace(/(^\d{2})(\d{3})(\d{3})(\d{4})(\d{2}$)/, '$1.$2.$3/$4-$5')
}

export function maskCEP(value: string): string {
    const regex = /(\d{5})(\d{3})/
    return unMask(value).replace(regex, '$1-$2')
}
