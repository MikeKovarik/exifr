export const TIFF_LITTLE_ENDIAN = 0x4949
export const TIFF_BIG_ENDIAN    = 0x4D4D

export function undefinedIfEmpty(object) {
    if (isEmpty(object))
        return undefined
    else
        return object
}

export function isEmpty(object) {
    return Object.keys(object).length === 0
}

export function customError(message) {
	let err = new Error(message)
	delete err.stack
	return err
}