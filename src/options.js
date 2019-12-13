import {TAG_MAKERNOTE, TAG_USERCOMMENT} from './tags.js'
import {TAG_IFD_EXIF, TAG_IFD_GPS, TAG_IFD_INTEROP} from './tags.js'
import {tagKeys} from './tags.js'
import {isBrowser} from './util/BufferView.js'


const configurableSegsOrBlocks = [
	// APP (jpg) Segments
	'jfif', 'tiff', 'xmp', 'icc', 'iptc',
	// TIFF Blocks
	'ifd0', 'exif', 'gps', 'interop', 'thumbnail',
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

	firstChunkSize = undefined
	// Size of the chunk that can be scanned for EXIF. Used by node.js.
	firstChunkSizeNode = 512
	// In browser its sometimes better to download larger chunk in hope that it contains the
	// whole EXIF (and not just its begining like in case of firstChunkSizeNode) in prevetion
	// of additional loading and fetching.
	firstChunkSizeBrowser = 64 * 1024
	// TODO
	minimalTiffSize = 10 * 1024

	// TODO
	translateTags = true
	// TODO
	translateValues = true
	// TODO
	reviveValues = true
	// Removes IFD pointers and other artifacts (useless for user) from output.
	sanitize = true
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
	// Cannot be used along with 'pick' array.
	skip = []
	// Array of the only tags that will be parsed. Those that are not specified will be ignored.
	// Extremely saves performance because only selected few tags are processed.
	// Useful for extracting few informations from a batch of many photos.
	// Cannot be used along with 'skip' array.
	pick = []

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
			this.pick = [...this.pick]
			this.skip = [...this.skip]
			if (userOptions.tiff === false) {
				// user disabled tiff. let's disable all of the blocks to prevent our pick/skip logic
				// from reenabling it.
				this.ifd0      = userOptions.ifd0      || false
				this.exif      = userOptions.exif      || false
				this.gps       = userOptions.gps       || false
				this.interop   = userOptions.interop   || false
				this.thumbnail = userOptions.thumbnail || false
			}
		}
		if (this.firstChunkSize === undefined)
			this.firstChunkSize = isBrowser ? this.firstChunkSizeBrowser : this.firstChunkSizeNode
		if (this.mergeOutput) this.thumbnail = false
		// first translate global pick/skip tags (that will later be copied to local, segment/block settings)
		this.assignGlobalFilterToLocalScopes()
		// handle the tiff->ifd0->exif->makernote pick dependency tree.
		// this also adds picks to blocks & segments to efficiently parse through tiff.
		this.normalizeFilters()
		// now we can translate local block/segment pick/skip tags
		for (let segKey of configurableSegsOrBlocks)
			this.translatePickOrSkip(segKey)
	}

	assignGlobalFilterToLocalScopes() {
		if (this.pick.length) {
			let entries = findScopesForGlobalTagArray(this.pick)
			for (let [segKey, tags] of entries) this.addPickTags(segKey, ...tags)
		} else if (this.skip.length) {
			let entries = findScopesForGlobalTagArray(this.skip)
			for (let [segKey, tags] of entries) this.addSkipTags(segKey, ...tags)
		}
	}

	// TODO: rework this using the new addPick() falling through mechanism
	normalizeFilters() {
		let opts = this
		if (isUnwanted(opts.exif) || hasPickTags(opts.exif) || opts.pick.length) {
			let tags = [...this.pick]
			if (Array.isArray(this.tiff)) tags.push(...this.tiff)
			if (opts.makerNote)   tags.push(TAG_MAKERNOTE)
			if (opts.userComment) tags.push(TAG_USERCOMMENT)
			if (tags.length)      opts.addPickTags('exif', ...tags)
		} else if (opts.exif) {
			// skip makernote & usercomment by default
			let tags = [...this.skip]
			if (!this.makerNote)   tags.push(TAG_MAKERNOTE)
			if (!this.userComment) tags.push(TAG_USERCOMMENT)
			if (tags.length)       opts.addSkipTags('exif', ...tags)
		}
		if (opts.interop && (isUnwanted(this.exif) || hasPickTags(opts.exif))) {
			// interop pointer can be often found in EXIF besides IFD0.
			opts.addPickTags('exif', TAG_IFD_INTEROP)
		}
		if ((isUnwanted(opts.ifd0) || hasPickTags(opts.ifd0) || opts.pick.length) && (opts.exif || opts.gps || opts.interop)) {
			let tags = [...this.pick]
			if (Array.isArray(this.tiff)) tags.push(...this.tiff)
			if (opts.exif)    tags.push(TAG_IFD_EXIF)
			if (opts.gps)     tags.push(TAG_IFD_GPS)
			if (opts.interop) tags.push(TAG_IFD_INTEROP)
			// offset of Interop IFD can be in both IFD0 and Exif IFD.
			opts.addPickTags('ifd0', ...tags)
		}
		if (isUnwanted(opts.tiff) && (opts.ifd0 || opts.thumbnail)) {
			opts.tiff = true
		}
	}

	addPick(segKey, tags, force = true) {
		if (this[segKey] === true && force === false) return
		this.addPickTags(segKey, ...tags)
		if (segKey === 'exif')
			this.addPick('ifd0', [TAG_IFD_EXIF], force)
		if (segKey === 'gps')
			this.addPick('ifd0', [TAG_IFD_GPS], force)
		if (segKey === 'interop') {
			this.addPick('ifd0', [TAG_IFD_INTEROP], force)
			this.addPick('exif', [TAG_IFD_INTEROP], force)
		}
		if (segKey === 'ifd0' && !this.tiff)
			this.tiff = true
	}

	addPickTags(segKey, ...tags) {
		let segOpts = this[segKey]
		if (Array.isArray(segOpts))
			this[segKey] = [...segOpts, ...tags] // not pushing to prevent modification of user's array
		else if (segOpts && segOpts.pick)
			segOpts.pick = [...segOpts.pick, ...tags] // not pushing to prevent modification of user's array
		else if (typeof segOpts === 'object')
			segOpts.pick = tags
		else
			this[segKey] = tags
	}

	addSkipTags(segKey, ...tags) {
		let segOpts = this[segKey]
		// if segment defines which tags to pick, there's no need to specify tags to skip.
		if (hasPickTags(segOpts)) return
		if (segOpts && segOpts.skip)
			segOpts.skip = [...segOpts.skip, ...tags] // not pushing to prevent modification of user's array
		else if (typeof segOpts === 'object')
			segOpts.skip = tags
		else
			this[segKey] = {skip: tags}
	}

	getPickTags(segKey, fallbackKey) {
		if (Array.isArray(this[segKey])) return this[segKey]
		if (Array.isArray(this[fallbackKey])) return this[fallbackKey]
		return (this[segKey] && this[segKey].pick)
			|| (this[fallbackKey] && this[fallbackKey].pick)
			|| this.pick
	}

	getSkipTags(segKey, fallbackKey) {
		return (this[segKey] && this[segKey].skip)
			|| (this[fallbackKey] && this[fallbackKey].skip)
			|| this.skip
	}

	translatePickOrSkip(segKey) {
		let segment = this[segKey]
		if (Array.isArray(segment)) {
			this[segKey] = segment = {pick: segment}
			translateSegmentPickOrSkip(segment, segKey)
		} else if (typeof segment === 'object') {
			translateSegmentPickOrSkip(segment, segKey)
		}
	}

}

function isUnwanted(segOpts) {
	return segOpts === undefined
		|| segOpts === false
}

function isConfigured(segOpts) {
	return Array.isArray(segOpts)
		|| typeof segOpts === 'object'
}

function hasPickTags(segOpts) {
	return Array.isArray(segOpts)
		|| segOpts && Array.isArray(segOpts.pick)
}

function translateSegmentPickOrSkip(segment, segKey, dict) {
	if (!dict) dict = tagKeys[segKey] || tagKeys.all
	let {pick, skip} = segment
	if (pick && pick.length > 0) segment.pick = translateTagArray(pick, dict)
	if (skip && skip.length > 0) segment.skip = translateTagArray(skip, dict)
}

function translateTagArray(tags, dict) {
	tags = tags.filter(isDefined) // clone array to avoid modification of user's array
	let dictKeys = Object.keys(dict)
	let dictValues = Object.values(dict)
	for (let i = 0; i < tags.length; i++) {
		let tag = tags[i]
		if (typeof tag === 'string') {
			let index = dictValues.indexOf(tag)
			if (index === -1) index = dictKeys.indexOf(Number(tag))
			if (index !== -1) tags[i] = Number(dictKeys[index])
		}
	}
	return unique(tags)
}

function findScopesForGlobalTagArray(tagArray) {
	let entries = []
	for (let [segKey, dict] of Object.entries(tagKeys)) {
		let scopedTags = []
		for (let [tagKey, tagName] of Object.entries(dict))
			if (tagArray.includes(tagKey) || tagArray.includes(tagName))
				scopedTags.push(Number(tagKey))
		if (scopedTags.length) entries.push([segKey, scopedTags])
	}
	return entries
}

const isDefined = item => item !== undefined
const unique = array => Array.from(new Set(array))

export default function optionsFactory(userOptions) {
	if (userOptions)
		return new Options(userOptions)
	else
		return new Options
}
