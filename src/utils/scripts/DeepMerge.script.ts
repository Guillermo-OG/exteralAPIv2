/* eslint-disable @typescript-eslint/no-explicit-any */

export function deepMerge<T>(obj1: T, obj2: Partial<T>): T {
    const output: T = { ...obj1 }

    for (const [key, value] of Object.entries(obj2)) {
        if (Object.prototype.hasOwnProperty.call(obj1, key)) {
            if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
                // A asserção de tipo é necessária aqui para apaziguar o TypeScript
                output[key as keyof T] = deepMerge(obj1[key as keyof T] as any, value)
            } else {
                output[key as keyof T] = value as any
            }
        }
    }
    return output
}
