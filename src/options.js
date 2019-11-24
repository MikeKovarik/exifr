import {TAG_MAKERNOTE, TAG_USERCOMMENT} from './tags.js'
import {TAG_IFD_EXIF, TAG_IFD_GPS, TAG_IFD_INTEROP} from './tags.js'
import {tagKeys} from './tags.js'


const configurableSegsOrBlocks = [
	// APP (jpg) Segments
	'jfif', 'tiff', 'xmp', 'icc', 'iptc',
	// TIFF Blocks
	'exif', 'gps', 'interop', 'thumbnail',
]

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
	// Changes output format by merging all segments and blocks into single object.
	// NOTE = Causes loss of thumbnail EXIF data.
	mergeOutput = true

	// APP1 TIFF segment - The basic EXIF tags (image, exif, gps)
	tiff = true
	// TIFF segment - Exif IFD block.
	ifd0 = true
	// TIFF segment - Exif IFD block.
	exif = true
	// TIFF segment - GPS IFD block - GPS latitue and longitude data.
	gps = true
	// TIFF segment - Interop IFD block - This is a thing too.
	interop = false
	// TIFF segment - IFD1 block - Size and other information about embeded thumbnail.
	thumbnail = false

	// APP0 segment
	jfif = false
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
			// We don't want to modify user's data. It would also break tests.
			this.pickTags = [...this.pickTags]
			this.skipTags = [...this.skipTags]
		}
		if (this.mergeOutput) this.thumbnail = false
		if (this.makerNote || this.userComment && (!this.exif || !this.tiff)) {
			console.log('want to parse makerNote or userComment but exif or tiff is disabled. TODO: enable tiff and add EXIF_IFD_POINTER to pickTags')
		}
		if (this.pickTags.length) {
			if (this.exif)    this.pickTags.push(TAG_IFD_EXIF)
			if (this.gps)     this.pickTags.push(TAG_IFD_GPS)
			if (this.interop) this.pickTags.push(TAG_IFD_INTEROP)
		}
		//if (!this.xmp)         this.skipTags.push(/* app notes tag */)
		if (!this.makerNote)   this.skipTags.push(TAG_MAKERNOTE)
		if (!this.userComment) this.skipTags.push(TAG_USERCOMMENT)
		// sanitize & translate tag names to tag codes
		this._translatePickOrSkip(this)
		for (let segKey of configurableSegsOrBlocks)
			this.translatePickOrSkip(segKey)
	}

	translatePickOrSkip(segKey) {
		let segment = this[segKey]
		if (Array.isArray(segment)) {
			this[segKey] = segment = {pickTags: segment}
			this._translatePickOrSkip(segment, segKey)
		} else if (typeof segment === 'object') {
			this._translatePickOrSkip(segment, segKey)
		}
	}

	_translatePickOrSkip(segment, segKey) {
		segment.pickTags = sanitizeTags(segment.pickTags, segKey)
		segment.skipTags = sanitizeTags(segment.skipTags, segKey)
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

	getPickTags(segKey, fallbackKey) {
		if (Array.isArray(this[segKey])) return this[segKey]
		if (Array.isArray(this[fallbackKey])) return this[fallbackKey]
		return (this[segKey] && this[segKey].pickTags)
			|| (this[fallbackKey] && this[fallbackKey].pickTags)
			|| this.pickTags
	}

	getSkipTags(segKey, fallbackKey) {
		return (this[segKey] && this[segKey].skipTags)
			|| (this[fallbackKey] && this[fallbackKey].skipTags)
			|| this.skipTags
	}

}

function sanitizeTags(tags, segKey) {
	let dict = tagKeys[segKey]
	tags = tags
		.map(tag => typeof tag === 'string' ? findTag(tag, dict) : tag)
		.filter(isDefined)
	return unique(tags)
}

// TODO: to be heavily refactored. this is just temporary implementation
function findTag(tag, dict) {
	if (dict) {
		for (let [key, name] of Object.entries(dict))
			if (tag === name) return Number(key)
	} else {
		for (let dict of Object.values(tagKeys))
			for (let [key, name] of Object.entries(dict))
				if (tag === name) return Number(key)
	}
}

const isDefined = item => item !== undefined
const unique = array => Array.from(new Set(array))

export default function optionsFactory(userOptions) {
	if (userOptions)
		return new Options(userOptions)
	else
		return new Options
}
