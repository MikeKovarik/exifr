var defaultOptions = {

	// READING & PARSING

	// We're trying not to read the whole file to increate performance but certain
	// segments (IPTC, XMP) require whole file to be buffered and parsed through.
	scanWholeFileForce: false,
	// Only the first 512 Bytes are scanned for EXIF due to performance reasons.
	// Setting this to true enables searching through the whole file.
	scanWholeFileFallback: false,
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

	// TIFF - The basic EXIF tags (image, exif, gps)
	tiff: true,
	// XMP = XML based extension, often used by editors like Photoshop.
	xmp: false,
	// ICC - Not implemented yet
	icc: false,
	// IPTC - Captions and copyrights
	iptc: false,

	// TIFF BLOCKS
	// Sub Exif.
	exif: true,
	// GPS latitue and longtitude data.
	gps: true,
	// Size and other information about embeded thumbnail.
	thumbnail: false,
	// This is a thing too.
	interop: false,

}

export function processOptions(objectOrBool) {
	var options = Object.assign({}, defaultOptions)
	if (typeof objectOrBool === 'boolean') {
		for (var key in options)
			if (key !== 'postProcess' && key !== 'mergeOutput' && typeof options[key] === 'boolean')
				options[key] = objectOrBool
	} else {
		Object.assign(options, objectOrBool)
	}
	if (options.xmp || options.icc || options.iptc)
		options.scanWholeFileForce = true
	return options
}