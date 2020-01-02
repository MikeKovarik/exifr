import {TAG_MAKERNOTE, TAG_USERCOMMENT} from './tags.js'
import {TAG_IFD_EXIF, TAG_IFD_GPS, TAG_IFD_INTEROP} from './tags.js'
import {TAG_GPS_LATREF, TAG_GPS_LAT, TAG_GPS_LONREF, TAG_GPS_LON} from './tags.js'
import {TAG_XMP, TAG_IPTC, TAG_ICC} from './tags.js'
import {tagKeys} from './tags.js'
import {isBrowser} from './util/BufferView.js'


export const readerProps = [
	'wholeFile',
	'firstChunkSize',
	'firstChunkSizeNode',
	'firstChunkSizeBrowser',
	'chunkSize',
	'chunkLimit',
]

export const segments = ['jfif', 'tiff', 'xmp', 'icc', 'iptc']

export const tiffBlocks = ['ifd0', 'exif', 'gps', 'interop', 'thumbnail']

export const segmentsAndBlocks = [...segments, ...tiffBlocks]

export const tiffExtractables = ['makerNote', 'userComment']

export const formatOptions = [
	'translateKeys',
	'translateValues',
	'reviveValues',
	'sanitize',
	'mergeOutput',
]

class FormatOptions {

	enabled = false
	skip = new Set
	pick = new Set
	translateKeys   = false
	translateValues = false
	reviveValues    = false

	constructor(defaultValue, userValue, globalOptions) {
		this.enabled = defaultValue

		this.translateKeys   = globalOptions.translateKeys
		this.translateValues = globalOptions.translateValues
		this.reviveValues    = globalOptions.reviveValues

		if (userValue !== undefined) {
			if (Array.isArray(userValue)) {
				this.enabled = true
				this.pick = new Set([...this.pick, ...userValue])
			} else if (typeof userValue === 'object') {
				this.enabled = true
				if (userValue.pick) this.pick = new Set([...this.pick, ...userValue.pick])
				if (userValue.skip) this.skip = new Set([...this.skip, ...userValue.skip])
				if (userValue.translateKeys   !== undefined) translateKeys   = obj.translateKeys
				if (userValue.translateValues !== undefined) translateValues = obj.translateValues
				if (userValue.reviveValues    !== undefined) reviveValues    = obj.reviveValues
			} else if (userValue === true || userValue === false) {
				this.enabled = userValue
			} else {
				throw new Error(`Invalid options argument: ${userValue}`)
			}
		}
	}

}

export class Options {

	// FILE READING

	// true      - forces reading the whole file
	// undefined - allows reading additional chunks of size `chunkSize` (chunked mode)
	// false     - does not allow reading additional chunks beyond `firstChunkSize` (chunked mode)
	static wholeFile = undefined
	// TODO
	static firstChunkSize = undefined
	// Size of the chunk that can be scanned for EXIF. Used by node.js.
	static firstChunkSizeNode = 512
	// In browser its sometimes better to download larger chunk in hope that it contains the
	// whole EXIF (and not just its begining like in case of firstChunkSizeNode) in prevetion
	// of additional loading and fetching.
	static firstChunkSizeBrowser = 65536 // 64kb
	// TODO
	static chunkSize = 65536 // 64kb
	// Maximum ammount of additional chunks allowed to read in chunk mode.
	// If the requested segments aren't parsed within N chunks (64*10 = 640kb) they probably aren't in the file.
	static chunkLimit = 10

	// OUTPUT

	// TODO
	static translateKeys = true
	// TODO
	static translateValues = true
	// TODO
	static reviveValues = true
	// Removes IFD pointers and other artifacts (useless for user) from output.
	static sanitize = true
	// Changes output format by merging all segments and blocks into single object.
	// NOTE = Causes loss of thumbnail EXIF data.
	static mergeOutput = true

	// WHAT TO PARSE

	// TIFF segment - Exif IFD block.
	static ifd0 = true
	// TIFF segment - Exif IFD block.
	static exif = true
	// TIFF segment - GPS IFD block - GPS latitue and longitude data.
	static gps = true
	// TIFF segment - Interop IFD block - This is a thing too.
	static interop = false
	// TIFF segment - IFD1 block - Size and other information about embeded thumbnail.
	static thumbnail = false

	// APP0 segment
	static jfif = false
	// APP1 TIFF segment - Basic EXIF tags. Consists of blocks ifd0, exif, gps, interop, thumbnail
	static tiff = true
	// APP1 XMP segment - XML based extension, often used by editors like Photoshop.
	static xmp = false
	// APP2 ICC segment
	static icc = false
	// APP13 IPTC segment - Captions and copyrights
	static iptc = false

	// TODO = implement
	static makerNote = false
	// TODO = implement
	static userComment = false

	// Array of tags that will be excluded when parsing.
	// Saves performance because the tags aren't read at all and thus not further processed.
	// Cannot be used along with 'pick' array.
	static skip = []
	// Array of the only tags that will be parsed. Those that are not specified will be ignored.
	// Extremely saves performance because only selected few tags are processed.
	// Useful for extracting few informations from a batch of many photos.
	// Cannot be used along with 'skip' array.
	static pick = []

	constructor(userOptions) {
		let type = typeof userOptions
		if (type === 'boolean')
			this.setupFromBool(userOptions)
		else if (type === 'object')
			this.setupFromObject(userOptions)
		else
			throw new Error(`Invalid options argument`)
	}

	setupFromBool(userOptions) {
		let key
		let defaults = this.constructor
		for (key of readerProps)       this[key] = defaults[key]
		for (key of formatOptions)     this[key] = defaults[key]
		for (key of tiffExtractables)  this[key] = userOptions
		for (key of segmentsAndBlocks) this[key] = new FormatOptions(userOptions)
	}

	setupFromObject(userOptions) {
		let key
		let defaults = this.constructor
		for (key of readerProps)       this[key] = getDefined(userOptions[key], defaults[key])
		for (key of formatOptions)     this[key] = getDefined(userOptions[key], defaults[key])
		for (key of tiffExtractables)  this[key] = getDefined(userOptions[key], defaults[key])
		for (key of segmentsAndBlocks) this[key] = new FormatOptions(defaults[key], userOptions[key], this)
        console.log('-: this', this)
		if (this.tiff.enabled === false) {
			// tiff is disabled. disable all tiff blocks to prevent our pick/skip logic from reenabling it.
			this.ifd0.enabled      = userOptions.ifd0      !== false
			this.exif.enabled      = userOptions.exif      !== false
			this.gps.enabled       = userOptions.gps       !== false
			this.interop.enabled   = userOptions.interop   !== false
			this.thumbnail.enabled = userOptions.thumbnail !== false
		}
		if (this.firstChunkSize === undefined)
			this.firstChunkSize = isBrowser ? this.firstChunkSizeBrowser : this.firstChunkSizeNode
		// thumbnail contains the same tags as ifd0. they're not necessary when `mergeOutput`
		if (this.mergeOutput) this.thumbnail.enabled = false
		// translate global pick/skip tags & copy them to local segment/block settings
		let {pick, skip} = userOptions
		if (pick && pick.length) {
			let entries = findScopesForGlobalTagArray(pick)
			for (let [segKey, tags] of entries) this.addPickTags(segKey, tags)
		} else if (skip && skip.length) {
			let entries = findScopesForGlobalTagArray(skip)
			for (let [segKey, tags] of entries) this.addSkipTags(segKey, tags)
		}
		// handle the tiff->ifd0->exif->makernote pick dependency tree.
		// this also adds picks to blocks & segments to efficiently parse through tiff.
		this.normalizeFilters()
		// now we can translate local block/segment pick/skip tags
		// apply global translattion options to all segments and blocks.
		//for (key of segmentsAndBlocks)
		//	translateSegmentPickOrSkip(this[key], key)
	}

	// TODO: rework this using the new addPick() falling through mechanism
	normalizeFilters() {
		let {tiff, ifd0, exif, gps, interop, thumbnail} = this
		if (exif.enabled && exif.pick.size) {
			let tags = []
			if (this.makerNote)   tags.push(TAG_MAKERNOTE)
			if (this.userComment) tags.push(TAG_USERCOMMENT)
			if (tags.length)      this.addPickTags('exif', tags)
		} else if (exif.enabled) {
			// skip makernote & usercomment by default
			let tags = []
			if (!this.makerNote)   tags.push(TAG_MAKERNOTE)
			if (!this.userComment) tags.push(TAG_USERCOMMENT)
			if (tags.length)       this.addSkipTags('exif', tags)
		}
		// interop pointer can be often found in EXIF besides IFD0.
		if (interop.enabled && (!exif.enabled || exif.pick.size)) {
			this.addPickTags('exif', [TAG_IFD_INTEROP])
		}
		if ((!ifd0.enabled || ifd0.pick.size) && (exif.enabled || gps.enabled || interop.enabled)) {
			let tags = []
			if (exif.enabled)    tags.push(TAG_IFD_EXIF)
			if (gps.enabled)     tags.push(TAG_IFD_GPS)
			if (interop.enabled) tags.push(TAG_IFD_INTEROP)
			// offset of Interop IFD can be in both IFD0 and Exif IFD.
			this.addPickTags('ifd0', tags)
		}
		if (!tiff.enabled && (ifd0.enabled || thumbnail.enabled)) {
			tiff.enabled = true
		}
		// todo
		if (exif.enabled)    this.addPickTags('ifd0', [TAG_IFD_EXIF], true)
		if (gps.enabled)     this.addPickTags('ifd0', [TAG_IFD_GPS], true)
		if (interop.enabled) {
			this.addPick('ifd0', [TAG_IFD_INTEROP], true)
			this.addPick('exif', [TAG_IFD_INTEROP], true)
		}
	}

	addPick(segKey, tags, bubble = true) {
		this.addPickTags(segKey, tags)
		if (bubble) {
			switch (segKey) {
				case 'exif':
					this.addPick('ifd0', [TAG_IFD_EXIF], true)
					break
				case 'gps':
					this.addPick('ifd0', [TAG_IFD_GPS], true)
					break
				case 'interop':
					this.addPick('ifd0', [TAG_IFD_INTEROP], true)
					this.addPick('exif', [TAG_IFD_INTEROP], true)
					break
				case 'ifd0':
					this.tiff.enabled = true
			}
		}
	}

	addPickTags(segKey, tags) {
		let segment = this[segKey]
		segment.enabled = true
		let {pick} = segment
		for (let tag of tags) pick.add(tag)
	}

	addSkipTags(segKey, tags) {
		let {skip} = this[segKey]
		for (let tag of tags) skip.add(tag)
	}

}

// TODO rework
function translateSegmentPickOrSkip(segment, segKey, dict) {
	if (!dict) dict = tagKeys[segKey] || tagKeys.all
	let {pick, skip} = segment
	if (pick && pick.size > 0) segment.pick = translateTagSet(segment.pick, dict)
	if (skip && skip.size > 0) segment.skip = translateTagSet(segment.skip, dict)
}

function translateTagSet(tags, dict) {
	let translated = new Set
	let dictKeys = Object.keys(dict)
	let dictValues = Object.values(dict)
	for (let tag of tags) {
		if (typeof tag === 'string') {
			let index = dictValues.indexOf(tag)
			if (index === -1) index = dictKeys.indexOf(Number(tag))
			if (index !== -1) translated.add(Number(dictKeys[index]))
		} else {
			translated.add(tag)
		}
	}
	return translated
}

function findScopesForGlobalTagArray(tagArray) {
	let entries = []
	for (let [segKey, dict] of Object.entries(tagKeys)) {
		let scopedTags = []
		for (let [tagKey, tagName] of Object.entries(dict))
			if (tagArray.includes(tagKey) || tagArray.includes(tagName))
				scopedTags.push(Number(tagKey))
		if (scopedTags.length)
			entries.push([segKey, scopedTags])
	}
	return entries
}

function getDefined(arg1, arg2) {
	if (arg1 !== undefined) return arg1
	if (arg2 !== undefined) return arg2
}

export let gpsOnlyOptions = {
	ifd0: false,
	exif: false,
	gps: [TAG_GPS_LATREF, TAG_GPS_LAT, TAG_GPS_LONREF, TAG_GPS_LON],
	interop: false,
	thumbnail: false,
	// turning off all unnecessary steps and transformation to get the needed data ASAP
	sanitize: false,
	reviveValues: true,
	translateKeys: false,
	translateValues: false,
	mergeOutput: false,
}