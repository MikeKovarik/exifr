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

export function estimateTiffSize(options) {
	let bytes = 0
	if (options.ifd0.enabled)    bytes += 1024
	if (options.exif.enabled)    bytes += 2048
	if (options.makerNote)       bytes += 2048
	if (options.userComment)     bytes += 1024
	if (options.gps.enabled)     bytes += 512
	if (options.interop.enabled) bytes += 100
	if (options.ifd1.enabled)    bytes += 1024
	return bytes + 2048 // issue-exif-js-124.tiff
}

export function estimateMetadataSize(options) {
	let bytes = estimateTiffSize(options)
	if (options.jfif.enabled) bytes += 50
	if (options.xmp.enabled)  bytes += 20000
	if (options.iptc.enabled) bytes += 14000
	if (options.icc.enabled)  bytes += 6000
	return bytes
}
