import { ValidationError } from 'yup'

interface IParsedError {
    [attr: string]: string[] | IParsedError
}

interface IErrorPath {
    path: string
    value: string[]
}

export function parseError(err: ValidationError): IParsedError {
    const paths = err.inner.reduce(errorReduce, [])
    const result = {} as IParsedError

    for (const { path, value } of paths) {
        const pathParts = path.split('.')
        let currentObject = result

        for (let i = 0; i < pathParts.length; i++) {
            const pathPart = pathParts[i]
            // eslint-disable-next-line no-prototype-builtins
            if (!currentObject.hasOwnProperty(pathPart)) {
                currentObject[pathPart] = {} as IParsedError
            }

            if (i === pathParts.length - 1) {
                currentObject[pathPart] = value
            }

            currentObject = currentObject[pathPart] as IParsedError
        }
    }

    return result
}

function errorReduce(acc: IErrorPath[], current: ValidationError): IErrorPath[] {
    if (current.inner.length) {
        return current.inner.reduce(errorReduce, acc)
    }
    if (current.path) {
        acc.push({
            path: current.path,
            value: current.errors,
        })
    }
    return acc
}
