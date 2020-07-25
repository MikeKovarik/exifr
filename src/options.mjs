import {TAG_MAKERNOTE, TAG_USERCOMMENT} from './tags.mjs'
import {TAG_IFD_EXIF, TAG_IFD_GPS, TAG_IFD_INTEROP} from './tags.mjs'
import {TAG_XMP, TAG_IPTC, TAG_ICC} from './tags.mjs'
import {tagKeys} from './tags.mjs'
import * as platform from './util/platform.mjs'
import {throwError} from './util/helpers.mjs'
import {segmentParsers, throwNotLoaded} from './plugins.mjs'


export const chunkedProps = [
	'chunked',
	'firstChunkSize',
	'firstChunkSizeNode',
	'firstChunkSizeBrowser',
	'chunkSize',
	'chunkLimit',
]

export const otherSegments = ['jfif', 'xmp', 'icc', 'iptc']
export const segments = ['tiff', ...otherSegments]
// WARNING: this order is necessary for correctly assigning pick tags.
export const tiffBlocks = ['ifd0', 'ifd1', 'exif', 'gps', 'interop']
export const segmentsAndBlocks = [...segments, ...tiffBlocks]
export const tiffExtractables = ['makerNote', 'userComment']
export const inheritables = ['translateKeys', 'translateValues', 'reviveValues', 'multiSegment']
export const allFormatters = [...inheritables, 'sanitize', 'mergeOutput']


class SharedOptions {

	get translate() {
		return this.translateKeys
			|| this.translateValues
			|| this.reviveValues
	}

}

class SubOptions extends SharedOptions {

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

	constructor(key, defaultValue, userValue, parent) {
		super()
		this.key = key
		this.enabled = defaultValue // todo: rename to extract
		this.parse = this.enabled

		this.applyInheritables(parent)

		this.canBeFiltered = tiffBlocks.includes(key)
		if (this.canBeFiltered)
			this.dict = tagKeys.get(key)

		if (userValue !== undefined) {
			if (Array.isArray(userValue)) {
				this.parse = this.enabled = true
				if (this.canBeFiltered && userValue.length > 0)
					this.translateTagSet(userValue, this.pick)
			} else if (typeof userValue === 'object') {
				this.enabled = true
				this.parse = userValue.parse !== false
				if (this.canBeFiltered) {
					let {pick, skip} = userValue
					if (pick && pick.length > 0) this.translateTagSet(pick, this.pick)
					if (skip && skip.length > 0) this.translateTagSet(skip, this.skip)
				}
				this.applyInheritables(userValue)
			} else if (userValue === true || userValue === false) {
				this.parse = this.enabled = userValue
			} else {
				throwError(`Invalid options argument: ${userValue}`)
			}
		}

	}

	applyInheritables(origin) {
		let key, val
		for (key of inheritables) {
			val = origin[key]
			if (val !== undefined) this[key] = val
		}
	}

	translateTagSet(inputArray, outputSet) {
		if (this.dict) {
			let {tagKeys, tagValues} = this.dict
			let tag, index
			for (tag of inputArray) {
				if (typeof tag === 'string') {
					index = tagValues.indexOf(tag)
					if (index === -1) index = tagKeys.indexOf(Number(tag))
					if (index !== -1) outputSet.add(Number(tagKeys[index]))
				} else {
					outputSet.add(tag)
				}
			}
		} else {
			for (let tag of inputArray) outputSet.add(tag)
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

var defaults = {
	// APP Segments
	jfif: false,
	tiff: true,
	xmp: false,
	icc: false,
	iptc: false,

	// TIFF BLOCKS
	ifd0: true, // image
	ifd1: false, // thumbnail
	exif: true,
	gps: true,
	interop: false,

	// Notable TIFF tags
	makerNote: false,
	userComment: false,

	// TODO: to be developed in future version, this is just a proposal for future api
	multiSegment: false,

	// FILTERS

	// Array of tags that will be excluded when parsing.
	// Saves performance because the tags aren't read at all and thus not further processed.
	// Cannot be used along with 'pick' array.
	skip: [],
	// Array of the only tags that will be parsed. Those that are not specified will be ignored.
	// Extremely saves performance because only selected few tags are processed.
	// Useful for extracting few informations from a batch of many photos.
	// Cannot be used along with 'skip' array.
	pick: [],

	// OUTPUT FORMATTERS

	translateKeys: true,
	translateValues: true,
	reviveValues: true,
	// Removes IFD pointers and other artifacts (useless for user) from output.
	sanitize: true,
	// Changes output format by merging all segments and blocks into single object.
	// NOTE = Causes loss of thumbnail EXIF data.
	mergeOutput: true,
	// Fails silently and logs the file errors in output.error instead of throwing error.
	silentErrors: true,

	// CHUNKED READER

	// true      - forces reading the whole file
	// undefined - allows reading additional chunks of size `chunkSize` (chunked mode)
	// false     - does not allow reading additional chunks beyond `firstChunkSize` (chunked mode)
	chunked: true,
	// Size of the chunk that can be scanned for EXIF.
	firstChunkSize: undefined,
	// Size of the chunk that can be scanned for EXIF. Used by node.js.
	firstChunkSizeNode: 512,
	// In browser its sometimes better to download larger chunk in hope that it contains the
	// whole EXIF (and not just its begining like in case of firstChunkSizeNode) in prevetion
	// of additional loading and fetching.
	firstChunkSizeBrowser: 65536, // 64kb
	// Size of subsequent chunks that are read after first chunk (if needed)
	chunkSize: 65536, // 64kb
	// Maximum amount of additional chunks allowed to read in chunk mode.
	// If the requested segments aren't parsed within N chunks (64*3 = 192kb) they probably aren't in the file.
	chunkLimit: 5,
}


var existingInstances = new Map

export class Options extends SharedOptions {

	static default = defaults

	static useCached(userOptions) {
		let options = existingInstances.get(userOptions)
		if (options !== undefined) return options
		options = new this(userOptions)
		existingInstances.set(userOptions, options)
		return options
	}

	constructor(userOptions) {
		super()
		if (userOptions === true)
			this.setupFromTrue()
		else if (userOptions === undefined)
			this.setupFromUndefined()
		else if (Array.isArray(userOptions))
			this.setupFromArray(userOptions)
		else if (typeof userOptions === 'object')
			this.setupFromObject(userOptions)
		else
			throwError(`Invalid options argument ${userOptions}`)
		if (this.firstChunkSize === undefined)
			this.firstChunkSize = platform.browser ? this.firstChunkSizeBrowser : this.firstChunkSizeNode
		// thumbnail contains the same tags as ifd0. they're not necessary when `mergeOutput`
		if (this.mergeOutput) this.ifd1.enabled = false
		// translate global pick/skip tags & copy them to local segment/block settings
		// handle the tiff->ifd0->exif->makernote pick dependency tree.
		// this also adds picks to blocks & segments to efficiently parse through tiff.
		this.filterNestedSegmentTags()
		this.traverseTiffDependencyTree()
		this.checkLoadedPlugins()
	}

	setupFromUndefined() {
		let key
		for (key of chunkedProps)      this[key] = defaults[key]
		for (key of allFormatters)     this[key] = defaults[key]
		for (key of tiffExtractables)  this[key] = defaults[key]
		for (key of segmentsAndBlocks) this[key] = new SubOptions(key, defaults[key], undefined, this)
	}

	setupFromTrue() {
		let key
		for (key of chunkedProps)      this[key] = defaults[key]
		for (key of allFormatters)     this[key] = defaults[key]
		for (key of tiffExtractables)  this[key] = true
		for (key of segmentsAndBlocks) this[key] = new SubOptions(key, true, undefined, this)
	}

	setupFromArray(userOptions) {
		let key
		for (key of chunkedProps)      this[key] = defaults[key]
		for (key of allFormatters)     this[key] = defaults[key]
		for (key of tiffExtractables)  this[key] = defaults[key]
		for (key of segmentsAndBlocks) this[key] = new SubOptions(key, false, undefined, this)
		this.setupGlobalFilters(userOptions, undefined, tiffBlocks)
	}

	setupFromObject(userOptions) {
		tiffBlocks.ifd0 = tiffBlocks.ifd0 || tiffBlocks.image
		tiffBlocks.ifd1 = tiffBlocks.ifd1 || tiffBlocks.thumbnail
		let key
		// needed for adding additional (and internal options properties like stopAfterSos for jpg)
		Object.assign(this, userOptions)
		for (key of chunkedProps)      this[key] = getDefined(userOptions[key], defaults[key])
		for (key of allFormatters)     this[key] = getDefined(userOptions[key], defaults[key])
		for (key of tiffExtractables)  this[key] = getDefined(userOptions[key], defaults[key])
		for (key of segments)          this[key] = new SubOptions(key, defaults[key], userOptions[key], this)
		for (key of tiffBlocks)        this[key] = new SubOptions(key, defaults[key], userOptions[key], this.tiff)
		this.setupGlobalFilters(userOptions.pick, userOptions.skip, tiffBlocks, segmentsAndBlocks)
		if (userOptions.tiff === true)
			this.batchEnableWithBool(tiffBlocks, true)
		else if (userOptions.tiff === false)
			this.batchEnableWithUserValue(tiffBlocks, userOptions)
		else if (Array.isArray(userOptions.tiff))
			this.setupGlobalFilters(userOptions.tiff, undefined, tiffBlocks)
		else if (typeof userOptions.tiff === 'object')
			this.setupGlobalFilters(userOptions.tiff.pick, userOptions.tiff.skip, tiffBlocks)
	}

	batchEnableWithBool(keys, value) {
		for (let key of keys)
			this[key].enabled = value
	}

	batchEnableWithUserValue(keys, userOptions) {
		for (let key of keys) {
			let userOption = userOptions[key]
			this[key].enabled = userOption !== false && userOption !== undefined
		}
	}

	setupGlobalFilters(pick, skip, dictKeys, disableableSegsAndBlocks = dictKeys) {
		if (pick && pick.length) {
			// if we're only picking, we can safely disable all other blocks and segments
			for (let blockKey of disableableSegsAndBlocks)
				this[blockKey].enabled = false
			let entries = findScopesForGlobalTagArray(pick, dictKeys)
			for (let [blockKey, tags] of entries) {
				addToSet(this[blockKey].pick, tags)
				// the blocks of tags from global picks are the only blocks we'll parse.
				this[blockKey].enabled = true
			}
		} else if (skip && skip.length) {
			let entries = findScopesForGlobalTagArray(skip, dictKeys)
			for (let [segKey, tags] of entries)
				addToSet(this[segKey].skip, tags)
		}
	}

	// XMP, IPTC can ICC can be stored as a tag in TIFF (in .tif files).
	// This method adds them to skip list if these segments are not requested.
	// Also applies to MakerNote and UserComment
	filterNestedSegmentTags() {
		let {ifd0, exif, xmp, iptc, icc} = this
		// not segments, regular but notable TIFF tags
		if (this.makerNote)   exif.deps.add(TAG_MAKERNOTE)
		else                  exif.skip.add(TAG_MAKERNOTE)
		if (this.userComment) exif.deps.add(TAG_USERCOMMENT)
		else                  exif.skip.add(TAG_USERCOMMENT)
		// segments that can be stored as tags (but only?? in .tiff)
		// note: not adding as deps because that is requested only in .tif file parser
		if (!xmp.enabled)  ifd0.skip.add(TAG_XMP)
		if (!iptc.enabled) ifd0.skip.add(TAG_IPTC)
		if (!icc.enabled)  ifd0.skip.add(TAG_ICC)
	}

	// INVESTIGATE: can this be moved to Tiff Segment parser?
	traverseTiffDependencyTree() {
		let {ifd0, exif, gps, interop} = this
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
		// reenable all the blocks with pick or deps and lock in deps into picks if needed.
		for (let key of tiffBlocks) this[key].finalizeFilters()
	}

	get onlyTiff() {
		let bools = otherSegments.map(key => this[key].enabled)
		if (bools.some(bool => bool === true)) return false
		return this.tiff.enabled
	}

	checkLoadedPlugins() {
		for (let key of segments)
			if (this[key].enabled && !segmentParsers.has(key))
				throwNotLoaded('segment parser', key)
	}

}

function findScopesForGlobalTagArray(tagArray, dictKeys) {
	let scopes = []
	let dict, scopedTags, blockKey, tagEntry
	for (blockKey of dictKeys) {
		dict = tagKeys.get(blockKey)
		scopedTags = []
		for (tagEntry of dict) {
			// NOTE: not expading tagEntry into [key, val] because of performance
			if (tagArray.includes(tagEntry[0]) || tagArray.includes(tagEntry[1]))
				scopedTags.push(tagEntry[0])
		}
		if (scopedTags.length)
			scopes.push([blockKey, scopedTags])
	}
	return scopes
}

function getDefined(arg1, arg2) {
	if (arg1 !== undefined) return arg1
	if (arg2 !== undefined) return arg2
}

function addToSet(target, source) {
	for (let item of source)
		target.add(item)
}