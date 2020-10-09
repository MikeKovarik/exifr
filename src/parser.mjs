import {BufferView} from './util/BufferView.mjs'
import {Options} from './options.mjs'
import {tagKeys, tagValues, tagRevivers} from './tags.mjs'
import {throwError} from './util/helpers.mjs'
import {segmentParsers} from './plugins.mjs'


const MAX_APP_SIZE = 65536 // 64kb

const DEFAULT = 'DEFAULT'

export class FileParserBase {

	constructor(options, file, parsers) {
		if (this.extendOptions)
			this.extendOptions(options)
		this.options = options
		this.file = file
		this.parsers = parsers
	}

	errors = []

	injectSegment(type, chunk) {
		if (this.options[type].enabled)
			this.createParser(type, chunk)
	}

	createParser(type, chunk) {
		let Parser = segmentParsers.get(type)
		let parser = new Parser(chunk, this.options, this.file)
		return this.parsers[type] = parser
	}

	// NOTE: This method was created to be reusable and not just one off. Mainly due to parsing ifd0 before thumbnail extraction.
	//       But also because we want to enable advanced users selectively add and execute parser on the fly.
	createParsers(segments) {
		// IDEA: dynamic loading through import(parser.type) ???
		//       We would need to know the type of segment, but we dont since its implemented in parser itself.
		//       I.E. Unless we first load apropriate parser, the segment is of unknown type.
		for (let segment of segments) {
			let {type, chunk} = segment
			let segOpts = this.options[type]
			if (segOpts && segOpts.enabled) {
				let parser = this.parsers[type]
				if (parser && parser.append) {
					// TODO multisegment: to be implemented. or deleted. some types of data may be split into multiple APP segments (FLIR, maybe ICC)
					//parser.append(chunk)
				} else if (!parser) {
					this.createParser(type, chunk)
				}
			}
		}
	}

	async readSegments(segments) {
		//let ranges = new Ranges(this.appSegments)
		//await Promise.all(ranges.list.map(range => this.file.ensureChunk(range.offset, range.length)))
		let promises = segments.map(this.ensureSegmentChunk)
		await Promise.all(promises)
	}

	// TODO: deprecate
	ensureSegmentChunk = async seg => {
		let start = seg.start
		let size = seg.size || MAX_APP_SIZE
		if (this.file.chunked) {
			if (this.file.available(start, size)) {
				seg.chunk = this.file.subarray(start, size)
			} else {
				try {
					seg.chunk = await this.file.readChunk(start, size)
				} catch (err) {
					throwError(`Couldn't read segment: ${JSON.stringify(seg)}. ${err.message}`)
				}
			}
		} else if (this.file.byteLength > start + size) {
			seg.chunk = this.file.subarray(start, size)
		} else if (seg.size === undefined) {
			// we dont know the length of segment and the file is much smaller than the fallback size of 64kbs (MAX_APP_SIZE)
			seg.chunk = this.file.subarray(start)
		} else {
			throwError(`Segment unreachable: ` + JSON.stringify(seg))
		}
		return seg.chunk
	}

}


/*
offset = where FF En starts
length = size of the whole APPn segment (header/marker + content)
start  = start of the content
size   = size of the content. i.e. from start till end
end    = end of the content (as well as the APPn segment)
*/
export class AppSegmentParserBase {

	static headerLength = 4
	// name. Couldn't use static name property because it is used by contructor name
	static type = undefined
	// The data may span multiple APP segments.
	static multiSegment = false

	static canHandle = () => false

	// offset + length === end  |  begining and end of the whole segment, including the segment header 0xFF 0xEn + two lenght bytes.
	// start  + size   === end  |  begining and end of parseable content
	static findPosition(buffer, offset) {
		// length at offset+2 is the size of APPn content plus the two appN length bytes. it does not include te appN 0xFF 0xEn marker.
		let length = buffer.getUint16(offset + 2) + 2
		let headerLength = typeof this.headerLength === 'function'
						? this.headerLength(buffer, offset, length)
						: this.headerLength
		let start = offset + headerLength
		let size = length - headerLength
		let end = start + size
		return {offset, length, headerLength, start, size, end}
	}

	static parse(input, segOptions = {}) {
		let options = new Options({[this.type]: segOptions})
		let instance = new this(input, options)
		return instance.parse()
	}

	normalizeInput(input) {
		return input instanceof BufferView
			? input
			: new BufferView(input)
	}

	errors = []
	// raw parsed tags
	raw = new Map

	constructor(chunk, options = {}, file) {
		// BufferView instance of the segment chunk. Possibly a subview of the same memory shared with this.file
		this.chunk = this.normalizeInput(chunk)
		// BufferView instance of the whole file.
		this.file = file
		this.type = this.constructor.type
		this.globalOptions = this.options = options // todo: rename to fileOptions ???
		this.localOptions = options[this.type] // todo: rename to this.options
		this.canTranslate = this.localOptions && this.localOptions.translate
	}

	// can be overriden by parses (namely TIFF) that inherits from this base class.
	translate() {
		if (this.canTranslate)
			this.translated = this.translateBlock(this.raw, this.type)
	}

	get output() {
		if (this.translated)
			return this.translated
		else if (this.raw)
			return Object.fromEntries(this.raw)
	}

	// split into separate function so that it can be used by TIFF but shared with other parsers.
	translateBlock(rawTags, blockKey) {
		let revivers = tagRevivers.get(blockKey)
		let valDict  = tagValues.get(blockKey)
		let keyDict  = tagKeys.get(blockKey)
		let blockOptions = this.options[blockKey] // todo: refactor tiff so this isn't needed anymore (in favor of segOptions & options)
		let canRevive       = blockOptions.reviveValues    && !!revivers
		let canTranslateVal = blockOptions.translateValues && !!valDict
		let canTranslateKey = blockOptions.translateKeys   && !!keyDict
		let output = {}
		for (let [key, val] of rawTags) {
			if (canRevive && revivers.has(key))
				val = revivers.get(key)(val)
			else if (canTranslateVal && valDict.has(key))
				val = this.translateValue(val, valDict.get(key))
			if (canTranslateKey && keyDict.has(key))
				key = keyDict.get(key) || key
			output[key] = val
		}
		return output
	}

	// can be overriden by parses (namely ICC) that inherits from this base class.
	translateValue(val, tagEnum) {
		return tagEnum[val] || tagEnum[DEFAULT] || val
	}

	handleError = error => {
		if (this.options.silentErrors)
			this.errors.push(error.message)
		else
			throw error
	}

	assignToOutput(root, parserOutput) {
		this.assignObjectToOutput(root, this.constructor.type, parserOutput)
	}

	assignObjectToOutput(root, key, parserOutput) {
		if (this.globalOptions.mergeOutput)
			return Object.assign(root, parserOutput)
		if (root[key])
			Object.assign(root[key], parserOutput)
		else
			root[key] = parserOutput
	}

}

const isDefined = val => val !== undefined
const findDefined = (...values) => values.find(isDefined)