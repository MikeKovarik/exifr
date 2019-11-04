import Reader from './reader.mjs'
import {tags} from './tags.mjs'
import {BufferView} from './util/BufferView.mjs'
import {AppSegment, parsers} from './parsers/core.mjs'
import './parsers/tiff.mjs'
import './parsers/jfif.mjs'
import './parsers/icc.mjs'
import './parsers/xmp.mjs'
import {TIFF_LITTLE_ENDIAN, TIFF_BIG_ENDIAN} from './parsers/tiff.mjs'

const CHUNKED = 'chunked'

// TODO: disable/enable tags dictionary
// TODO: public tags dictionary. user can define what he needs and uses 

const THUMB_OFFSET  = 0x0201
const THUMB_LENGTH  = 0x0202










export class Iptc extends AppSegment {

	parse() {
		let dictionary = tags.iptc
		let iptc = {}
		var offset = this.start
		for (var offset = 0; offset < this.end; offset++) {
			// reading Uint8 and then another to prevent unnecessarry read of two subsequent bytes, when iterating
			if (this.buffer.getUint8(offset) === 0x1C && this.buffer.getUint8(offset + 1) === 0x02) {
				let size = this.buffer.getUint16(offset + 3)
				let tag = this.buffer.getUint8(offset + 2)
				let key = dictionary[tag] || tag // TODO: translate tags on demand
				let val = this.buffer.getString(offset + 5, size)
				iptc[key] = this.setValueOrArrayOfValues(val, iptc[key])
			}
		}
		this.output = this.options.mergeOutput ? {iptc} : iptc
		return this.output
	}

	setValueOrArrayOfValues(newValue, existingValue) {
		if (existingValue !== undefined) {
			if (existingValue instanceof Array) {
				existingValue.push(newValue)
				return existingValue
			} else {
				return [existingValue, newValue]
			}
		} else {
			return newValue
		}
	}

	// NOTE: This only works with single segment IPTC data.
	// TODO: Implement multi-segment parsing.
	//function findIptc(buffer, offset = 0) {
	//	return findAppSegment(buffer, 13, isIptcSegment, getIptcSize)
	//}
/*
	// NOTE: reverted back to searching by the 38 42 49... bytes, because ID string could change (Photoshop 2.5, Photoshop 3)
	findIptc(buffer, offset) {
		var length = (buffer.length || buffer.byteLength) - 10
		for (var offset = 0; offset < length; offset++) {
			if (isIptcSegmentHead(buffer, offset)) {
				// Get the length of the name header (which is padded to an even number of bytes)
				var nameHeaderLength = buffer.getUint8(offset + 7)
				if (nameHeaderLength % 2 !== 0)
					nameHeaderLength += 1
				// Check for pre photoshop 6 format
				if (nameHeaderLength === 0)
					nameHeaderLength = 4
				var start = offset + 8 + nameHeaderLength
				var size = buffer.getUint16(offset + 6 + nameHeaderLength)
				var end = start + size
				return {start, size, end}
			}
		}
	}

	isIptcSegmentHead(buffer, offset) {
		return buffer.getUint8(offset)     === 0x38
			&& buffer.getUint8(offset + 1) === 0x42
			&& buffer.getUint8(offset + 2) === 0x49
			&& buffer.getUint8(offset + 3) === 0x4D
			&& buffer.getUint8(offset + 4) === 0x04
			&& buffer.getUint8(offset + 5) === 0x04
	}
*/
}











function getSegmentType(buffer, offset) {
	for (let [name, Parser] of Object.entries(parsers))
		if (Parser.canHandle(buffer, offset)) return name
}

// First argument can be Node's Buffer or Web's DataView instance.
// Takes chunk of file and tries to find EXIF (it usually starts inside the chunk, but is much larger).
// Returns location {start, size, end} of the EXIF in the file not the input chunk itself.

parsers.iptc = Iptc




// https://en.wikipedia.org/wiki/JPEG_File_Interchange_Format
// https://sno.phy.queensu.ca/~phil/exiftool/TagNames/JPEG.html
// http://dev.exiv2.org/projects/exiv2/wiki/The_Metadata_in_JPEG_files
// JPG contains SOI, APP1, [APP2, ... APPn], DQT, DHT, and more segments
// APPn contain metadata about the image in various formats. There can be multiple APPn segments,
// even multiple segments of the same type.
// APP1 contains the basic and most important EXIF data.
// APP2 contains ICC
// APP13 contains IPTC
// the main APP1 (the one with EXIF) is often followed by another APP1 with XMP data (in XML format).
// Structure of APPn (APP1, APP2, APP13, etc...):
// - First two bytes are the marker FF En (e.g. FF E1 for APP1)
// - 3rd & 4th bytes are length of the APPn segment
// - Followed by a few bytes of segment itentification - describing what type of content is there.
// Structure of TIFF (APP1-EXIF):
// - FF 01 - marker
// - xx xx - Size
// - 45 78 69 66 00 00 / ASCII string 'Exif\0\0'
// - TIFF HEADER
// - 0th IFD + value
// - 1th IFD + value
// - may contain additional GPS, Interop, SubExif blocks (pointed to from IFD0)
export class Exifr extends Reader {

	constructor(...args) {
		//console.log('ExifParser')
		super(...args)
		this.pos = {}

		this.requiredParsers = Object.values(parsers).filter(Parser => !!this.options[Parser.type])
		//console.log('parsers', parsers)
		//console.log('requiredParsers', this.requiredParsers)
		//console.log('options', this.options)
	}

	// TODO: Some images don't have any exif but they do have XMP burried somewhere
	// TODO: Add API to allow this. something like bruteForce: false
	async read(arg) {
		//console.log('read 1', arg)
		//console.log('ExifParser read', arg)
		//console.log('read 2')
		this.buffer = await super.read(arg) || this.reader || this.view
		//console.log('read 3')
		//console.log('this.buffer', this.buffer)
		if (this.buffer === undefined) {
			throw new Error('buffer is undefined, not enough file read? maybe file wasnt read at all')
		}
		//console.log('read 4')
		this.findAppSegments()
		//console.log('read 5')
	}

	findAppSegments(offset = 0) {
		this.segments = []
		this.unknownSegments = []

		let view = this.view = new BufferView(this.buffer) // TODO refactor
		let length = view.byteLength - 10 // No need to parse through till the end of the buffer.
		
		// JPEG with EXIF segment starts with App1 header (FF E1, length, 'Exif\0\0') and then follows the TIFF.
		// Whereas .tif file format starts with the TIFF structure right away.
		var marker = view.getUint16(0)
		if (marker === TIFF_LITTLE_ENDIAN || marker === TIFF_BIG_ENDIAN) {
			this.segments.push({
				start: 0,
				type: 'exif',
			})
		}

		for (; offset < length; offset++) {
			if (view.getUint8(offset) === 0xFF
			&& (view.getUint8(offset + 1) & 0xF0) === 0xE0) {
				let type = getSegmentType(view, offset)
				if (type) {
					// known and parseable segment found
					let Parser = parsers[type]
					let position = Parser.findPosition(view, offset)
					position.type = type
					this.segments.push(position)
					if (position.end)
						offset = position.end - 1
					else if (position.length)
						offset += position.length - 1
				} else {
					// either unknown/supported appN segment or just a noise.
					let position = AppSegment.findPosition(view, offset)
					this.unknownSegments.push(position)
				}
			}
		}

		console.log('segments', this.segments)
		console.log('unknownSegments', this.unknownSegments)
	}

	async parse() {

		this.parsers = {}

		let output = {}

		if (this.options.tiff && !parsers.tiff) throw new Error('TIFF Parser was not loaded, try using full build of exifr.')
		if (this.options.iptc && !parsers.iptc) throw new Error('IPTC Parser was not loaded, try using full build of exifr.')
		if (this.options.icc && !parsers.icc)   throw new Error('ICC Parser was not loaded, try using full build of exifr.')
		if (this.options.xmp && !parsers.xmp)   throw new Error('XMP Parser was not loaded, try using full build of exifr.')

		let promises = this.segments
			.filter(segment => !!this.options[segment.type])
			.map(async segment => {
				console.log('---------------------------------------------------------')
				console.log(segment.type)
				//var full = this.buffer.slice(segment.offset, segment.end)
				//console.log('full   ', full.length.toString().padStart(2, ' '), full)
				//let string = toString(this.buffer, segment.start, segment.end)
				//console.log('string', string)
				let Parser = parsers[segment.type]
				//let chunkView = new BufferView(this.buffer, segments.start, segment.size)
				let chunkView = this.buffer.subarray(segment.start, segment.size)
				let parser = new Parser(chunkView, this.options)
				this.parsers[segment.type] = parser
				let parserOutput = await parser.parse() || parser.output
				if (!this.options.mergeOutput || typeof parserOutput === 'string')
					output[segment.type] = parserOutput
				else
					Object.assign(output, parserOutput)
			})
		await Promise.all(promises)
		return output
	}

	// THUMBNAIL buffer of TIFF of APP1 segment
	async extractThumbnail() {
		// return undefined if file has no exif
		if (this.pos.tiff === undefined) return
		if (!this.tiffParsed) await this.parseTiff()
		if (!this.thumbnailParsed) await this.parseThumbnailBlock(true)
		if (this.thumbnail === undefined) return 
		// TODO: replace 'ThumbnailOffset' & 'ThumbnailLength' by raw keys (when tag dict is not included)
		let offset = this.thumbnail[THUMB_OFFSET] + this.pos.tiff.start
		let length = this.thumbnail[THUMB_LENGTH]
		let arrayBuffer = this.buffer.buffer
		let slice = arrayBuffer.slice(offset, offset + length)
		if (typeof Buffer !== 'undefined')
			return Buffer.from(slice)
		else
			return slice
	}

}

/*
	async parseTags(offset) {
		// TODO: re-read file if portion of the exif is outside of read chunk
		// (test/001.tif has tiff segment at the beggining plus at the end)
		if (offset > this.view.byteLength) {
			if (this.view.isRangeRead(offset, 5000))
			if (this.mode === CHUNKED) {
				var chunk = await this.view.readChunk({
					start: offset,
					size: 10000,
				})
				offset = 0
			} else {
				throw new Error(`segment offset ${offset} is out of chunk size ${this.view.byteLength}`)
			}
		} else {
			var chunk = this.view
		}
		return super.parseTags(chunk, offset)
	}
*/
export var ExifParser = Exifr
