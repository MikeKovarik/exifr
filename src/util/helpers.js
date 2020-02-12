export const TIFF_LITTLE_ENDIAN = 0x4949
export const TIFF_BIG_ENDIAN    = 0x4D4D

export function undefinedIfEmpty(object) {
    if (isEmpty(object))
        return undefined
    else
        return object
}

export function isEmpty(arg) {
	if (arg === undefined) return true
	if (arg instanceof Map)
		return arg.size === 0
	else
	    return Object.keys(arg).length === 0
}

export function customError(message) {
	let err = new Error(message)
	delete err.stack
	return err
}

export function removeNullTermination(string) {
	while (string.endsWith('\0'))
		string = string.slice(0, -1)
	return string
}