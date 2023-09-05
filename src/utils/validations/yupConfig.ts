import { setLocale } from 'yup'

setLocale({
    mixed: {
        default: 'Campo inválido',
        required: '${field} é obrigatório',
        oneOf: 'Um dos valores deve ser selecionado: ${values}',
        notOneOf: 'Nenhum dos valores deve ser selecionado: ${values}',
        defined: 'Não deve ser indefinido',
    },
    string: {
        email: 'E-mail inválido',
        url: 'URL inválida',
        trim: 'Não deve conter espaços no início ou no fim',
        lowercase: 'Deve ser um texto minúsculo',
        uppercase: 'Deve ser um texto maiúsculo',
        min: 'Deve ter pelo menos ${min} caracteres',
        max: 'Deve ter no máximo ${max} caracteres',
        length: 'Deve ter exatamente ${length} caracteres',
        matches: 'Deve corresponder ao padrão: ${regex}',
    },
    number: {
        min: 'Deve ser pelo menos ${min}',
        max: 'Deve ser no máximo ${max}',
        lessThan: 'Deve ser menor que ${less}',
        moreThan: 'Deve ser maior que ${more}',
        positive: 'Deve ser um número positivo',
        negative: 'Deve ser um número negativo',
        integer: 'Deve ser um número inteiro',
    },
    date: {
        min: 'Data deve ser após ${min}',
        max: 'Data deve ser antes ${max}',
    },
    array: {
        min: 'Deve ter pelo menos ${min} itens',
        max: 'Deve ter no máximo ${max} itens',
    },
    object: {
        noUnknown: 'Possui chaves não especificadas na forma do objeto',
    },
    boolean: {},
})
