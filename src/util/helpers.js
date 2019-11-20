export function undefinedIfEmpty(object) {
    if (isEmpty(object))
        return undefined
    else
        return object
}

export function isEmpty(object) {
    return Object.keys(object).length === 0
}