export const defaultOptions = {

	// READING & PARSING

	// We're trying not to read the whole file to increase performance but certain
	// segments (IPTC, XMP) require whole file to be buffered and parsed through.
	//forceWholeFile: false,
	// Only the first 512 Bytes are scanned for EXIF due to performance reasons.
	// Setting this to true enables searching through the whole file.
	//allowWholeFile: false,

	// true - force fetching whole file / reading whole file (whole file mode)
	// undefined - allow reading additional chunks (chunked mode)
	// false - do not allow reading additional chunks (chunked mode)
	wholeFile: undefined,

	// Size of the chunk that can be scanned for EXIF.
	seekChunkSize: 512,
	// In browser its sometimes better to download larger chunk in hope that it contains the
	// whole EXIF (and not just its begining like in case of seekChunkSize) in prevetion
	// of additional loading and fetching.
	parseChunkSize: 64 * 1024,

	// Translate enum values to strings, convert dates to Date instances, etc...
	postProcess: true,
	// Changes output format by merging all segments and blocks into single object.
	// NOTE: Causes loss of thumbnail EXIF data.
	mergeOutput: true,

	// PARSED SEGMENTS

	// APP0
	jfif: false,
	// APP1 - TIFF - The basic EXIF tags (image, exif, gps)
	tiff: true,
	// APP1 - XMP = XML based extension, often used by editors like Photoshop.
	xmp: false,
	// APP2 - ICC - Not implemented yet
	icc: false,
	// APP13 - IPTC - Captions and copyrights
	iptc: false,

	// TIFF BLOCKS
	// APP1 - Exif IFD.
	exif: true,
	// APP1 - GPS IFD - GPS latitue and longitude data.
	gps: true,
	// APP1 - Interop IFD - This is a thing too.
	interop: false,
	// APP1 - IFD1 - Size and other information about embeded thumbnail.
	thumbnail: false,

}

export function processOptions(userOptions = {}) {
	let options = Object.assign({}, defaultOptions)
	if (userOptions === true || userOptions === false) {
		for (let key in options) options[key] = userOptions
		options.mergeOutput = defaultOptions.mergeOutput
		options.postProcess = defaultOptions.postProcess
	} else {
		Object.assign(options, userOptions)
	}
	if (options.mergeOutput) options.thumbnail = false
	return options
}