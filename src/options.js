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

// WARNING: this order is necessary for correctly assigning pick tags.
export const tiffBlocks = ['thumbnail', 'interop', 'gps', 'exif', 'ifd0']

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
	deps = new Set // tags required by other blocks or segments (IFD pointers, makernotes)
	translateKeys   = false
	translateValues = false
	reviveValues    = false
	
	get needed() {
		return this.enabled
			|| this.deps.size > 0
	}

	constructor(segKey, defaultValue, userValue, globalOptions) {
		this.enabled = defaultValue

		this.translateKeys   = globalOptions.translateKeys
		this.translateValues = globalOptions.translateValues
		this.reviveValues    = globalOptions.reviveValues

		this.canBeFiltered = tiffBlocks.includes(segKey)
		if (this.canBeFiltered) {
			this.dict = tagKeys[segKey]
			this.dictKeys   = Object.keys(this.dict)
			this.dictValues = Object.values(this.dict)
		}

		if (userValue !== undefined) {
			if (Array.isArray(userValue)) {
				this.enabled = true
				if (userValue.length > 0) this.translateTagSet(userValue, this.pick)
			} else if (typeof userValue === 'object') {
				this.enabled = true
				let {pick, skip, translateKeys, translateValues, reviveValues} = userValue
				if (this.canBeFiltered) {
					if (pick && pick.length > 0) this.translateTagSet(pick, this.pick)
					if (skip && skip.length > 0) this.translateTagSet(skip, this.skip)
				}
				if (translateKeys   !== undefined) this.translateKeys   = translateKeys
				if (translateValues !== undefined) this.translateValues = translateValues
				if (reviveValues    !== undefined) this.reviveValues    = reviveValues
			} else if (userValue === true || userValue === false) {
				this.enabled = userValue
			} else {
				throw new Error(`Invalid options argument: ${userValue}`)
			}
		}
	}

	translateTagSet(inputArray, outputSet) {
		let {dictKeys, dictValues} = this
		for (let tag of inputArray) {
			if (typeof tag === 'string') {
				let index = dictValues.indexOf(tag)
				if (index === -1) index = dictKeys.indexOf(Number(tag))
				if (index !== -1) outputSet.add(Number(dictKeys[index]))
			} else {
				outputSet.add(tag)
			}
		}
	}

	finalizeFilters() {
		if (!this.enabled && this.deps.size > 0) {
			this.enabled = true
			addToSet(this.pick, this.deps)
		} else if (this.enabled && this.pick.size > 0) {
			addToSet(this.pick, this.deps)
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
		else if (userOptions === undefined)
			this.setupFromUndefined()
		else
			throw new Error(`Invalid options argument ${userOptions}`)
	}

	setupFromUndefined() {
		let key
		let defaults = this.constructor
		for (key of readerProps)       this[key] = defaults[key]
		for (key of formatOptions)     this[key] = defaults[key]
		for (key of tiffExtractables)  this[key] = defaults[key]
		for (key of segmentsAndBlocks) this[key] = new FormatOptions(key, defaults[key], undefined, this)
	}

	setupFromBool(userOptions) {
		let key
		let defaults = this.constructor
		for (key of readerProps)       this[key] = defaults[key]
		for (key of formatOptions)     this[key] = defaults[key]
		for (key of tiffExtractables)  this[key] = userOptions
		for (key of segmentsAndBlocks) this[key] = new FormatOptions(key, defaults[key], userOptions[key], this)
	}

	setupFromObject(userOptions) {
		let key
		let defaults = this.constructor
		for (key of readerProps)       this[key] = getDefined(userOptions[key], defaults[key])
		for (key of formatOptions)     this[key] = getDefined(userOptions[key], defaults[key])
		for (key of tiffExtractables)  this[key] = getDefined(userOptions[key], defaults[key])
		for (key of segmentsAndBlocks) this[key] = new FormatOptions(key, defaults[key], userOptions[key], this)
		// tiff is disabled. disable all tiff blocks to prevent our pick/skip logic from reenabling it.
		if (userOptions.tiff === false)
			for (key of tiffBlocks)
				this[key].enabled = userOptions[key] === true
		if (this.firstChunkSize === undefined)
			this.firstChunkSize = isBrowser ? this.firstChunkSizeBrowser : this.firstChunkSizeNode
		// thumbnail contains the same tags as ifd0. they're not necessary when `mergeOutput`
		if (this.mergeOutput) this.thumbnail.enabled = false
		// translate global pick/skip tags & copy them to local segment/block settings
		let {pick, skip} = userOptions
		if (pick && pick.length) {
			let entries = findScopesForGlobalTagArray(pick)
			for (let [segKey, tags] of entries) addToSet(this[segKey].pick, tags)
			console.warn('TODO: skip and disable all other blocks with unassigned properties')
		} else if (skip && skip.length) {
			let entries = findScopesForGlobalTagArray(skip)
			for (let [segKey, tags] of entries) addToSet(this[segKey].skip, tags)
		}
		// handle the tiff->ifd0->exif->makernote pick dependency tree.
		// this also adds picks to blocks & segments to efficiently parse through tiff.
		this.normalizeFilters()
		this.finalizeFilters()
	}

	// TODO: rework this using the new addPick() falling through mechanism
	normalizeFilters() {
		let {ifd0, exif, gps, interop} = this
		if (this.makerNote)   exif.deps.add(TAG_MAKERNOTE)
		else                  exif.skip.add(TAG_MAKERNOTE)
		if (this.userComment) exif.deps.add(TAG_USERCOMMENT)
		else                  exif.skip.add(TAG_USERCOMMENT)
		// interop pointer can be often found in EXIF besides IFD0.
		if (interop.needed) {
			exif.deps.add(TAG_IFD_INTEROP)
			ifd0.deps.add(TAG_IFD_INTEROP)
		}
		// exif needs to go after interop. Exif may be needed for interop, and then ifd0 for exif
		if (exif.needed)      ifd0.deps.add(TAG_IFD_EXIF)
		if (gps.needed)       ifd0.deps.add(TAG_IFD_GPS)
		this.tiff.enabled = tiffBlocks.some(key => this[key].enabled === true)
						|| this.makerNote
						|| this.userComment
	}

	finalizeFilters() {
		for (let key of tiffBlocks)
			this[key].finalizeFilters()
	}

}

function findScopesForGlobalTagArray(tagArray) {
	let entries = []
	for (let [key, dict] of Object.entries(tagKeys)) {
		let scopedTags = []
		for (let [tagKey, tagName] of Object.entries(dict))
			if (tagArray.includes(tagKey) || tagArray.includes(tagName))
				scopedTags.push(Number(tagKey))
		if (scopedTags.length)
			entries.push([key, scopedTags])
	}
	return entries
}

function getDefined(arg1, arg2) {
	if (arg1 !== undefined) return arg1
	if (arg2 !== undefined) return arg2
}

function addToSet(target, source) {
	for (let item of source)
		target.add(item)
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