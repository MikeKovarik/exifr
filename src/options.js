import {TAG_MAKERNOTE, TAG_USERCOMMENT} from './tags.js'
import {TAG_IFD_EXIF, TAG_IFD_GPS, TAG_IFD_INTEROP} from './tags.js'
import {tags, findTag} from './tags.js'


class Options {

	// READING & PARSING

	// We're trying not to read the whole file to increase performance but certain
	// segments (IPTC, XMP) require whole file to be buffered and parsed through.
	//forceWholeFile = false
	// Only the first 512 Bytes are scanned for EXIF due to performance reasons.
	// Setting this to true enables searching through the whole file.
	//allowWholeFile = false

	// true - force fetching whole file / reading whole file (whole file mode)
	// undefined - allow reading additional chunks (chunked mode)
	// false - do not allow reading additional chunks (chunked mode)
	wholeFile = undefined

	// Size of the chunk that can be scanned for EXIF.
	seekChunkSize = 512
	// In browser its sometimes better to download larger chunk in hope that it contains the
	// whole EXIF (and not just its begining like in case of seekChunkSize) in prevetion
	// of additional loading and fetching.
	parseChunkSize = 64 * 1024

	// Removes IFD pointers and other artifacts (useless for user) from output.
	sanitize = true
	// TODO
	reviveValues = true
	// TODO
	translateTags = true
	// TODO
	translateValues = true
	// Translate enum values to strings, convert dates to Date instances, etc...
	postProcess = true // todo = deprecate
	// Changes output format by merging all segments and blocks into single object.
	// NOTE = Causes loss of thumbnail EXIF data.
	mergeOutput = true

	// APP0 segment
	jfif = false
	// APP1 TIFF segment - The basic EXIF tags (image, exif, gps)
	tiff = true
	// APP1 TIFF segment - Exif IFD block.
	exif = true
	// APP1 TIFF segment - GPS IFD block - GPS latitue and longitude data.
	gps = true
	// APP1 TIFF segment - Interop IFD block - This is a thing too.
	interop = false
	// APP1 TIFF segment - IFD1 block - Size and other information about embeded thumbnail.
	thumbnail = false
	// APP1 XMP segment - XML based extension, often used by editors like Photoshop.
	xmp = false
	// APP2 ICC segment
	icc = false
	// APP13 IPTC segment - Captions and copyrights
	iptc = false

	// TODO = implement
	makerNote = false
	// TODO = implement
	userComment = false

	// Array of tags that will be excluded when parsing.
	// Saves performance because the tags aren't read at all and thus not further processed.
	// Cannot be used along with 'pickTags' array.
	skipTags = []
	// Array of the only tags that will be parsed. Those that are not specified will be ignored.
	// Extremely saves performance because only selected few tags are processed.
	// Useful for extracting few informations from a batch of many photos.
	// Cannot be used along with 'skipTags' array.
	pickTags = []

	constructor(userOptions) {
		if (userOptions === true || userOptions === false) {
			for (let [key, val] of Object.entries(this)) {
				if (val === undefined || typeof val === 'boolean') {
					this[key] = userOptions
				}
			}
		} else if (userOptions !== undefined) {
			Object.assign(this, userOptions)
		}
		if (this.mergeOutput) this.thumbnail = false
		if (this.pickTags.length) {
			if (this.exif)    this.pickTags.push(TAG_IFD_EXIF)
			if (this.gps)     this.pickTags.push(TAG_IFD_GPS)
			if (this.interop) this.pickTags.push(TAG_IFD_INTEROP)
		}
		//if (!this.xmp)         this.skipTags.push(/* app notes tag */)
		if (!this.makerNote)   this.skipTags.push(TAG_MAKERNOTE)
		if (!this.userComment) this.skipTags.push(TAG_USERCOMMENT)
		this.pickTags = this._translateTagCodes(this.pickTags)
		this.skipTags = this._translateTagCodes(this.skipTags)
	}

	_translateTagCodes(tags) {
		return unique(tags.map(findTagIfPossible))
	}

	addPickTags(segKey, ...tags) {
		let segOpts = this[segKey]
		if (Array.isArray(segOpts)) {
			segOpts.push(...tags)
		} else if (typeof segOpts === 'object') {
			segOpts.pickTags.push(...tags)
		} else {
			this[segKey] = tags
		}
	}

	addSkipTags(segKey, ...tags) {
		let segOpts = this[segKey]
		if (!Array.isArray(segOpts) && typeof segOpts === 'object') {
			segOpts.skipTags.push(...tags)
		} else {
			this[segKey] = tags
		}
	}

}

function findTagIfPossible(tag) {
	return typeof tag === 'string' ? findTag(tag) : tag
}

function unique(array) {
	return Array.from(new Set(array))
}

export default function optionsFactory(userOptions) {
	if (userOptions)
		return new Options(userOptions)
	else
		return new Options
}
