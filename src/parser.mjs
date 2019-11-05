import Reader from './reader.mjs'
import {tags} from './tags.mjs'
import {BufferView} from './util/BufferView.mjs'
import {AppSegment, parsers as parserClasses} from './parsers/core.mjs'
import './parsers/tiff.mjs'
import './parsers/jfif.mjs'
import './parsers/icc.mjs'
import './parsers/xmp.mjs'
import {TIFF_LITTLE_ENDIAN, TIFF_BIG_ENDIAN} from './parsers/tiff.mjs'

// TODO: disable/enable tags dictionary
// TODO: public tags dictionary. user can define what he needs and uses 

const THUMB_OFFSET  = 0x0201
const THUMB_LENGTH  = 0x0202

const MAX_APP_SIZE = 65536 // 64kb











function getSegmentType(buffer, offset) {
	for (let Parser of Object.values(parserClasses))
		if (Parser.canHandle(buffer, offset)) return Parser.type
}

// First argument can be Node's Buffer or Web's DataView instance.
// Takes chunk of file and tries to find EXIF (it usually starts inside the chunk, but is much larger).
// Returns location {start, size, end} of the EXIF in the file not the input chunk itself.


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

	findAppSegments() {
		this.segments = []
		this.unknownSegments = []

		let view = this.view
		console.log('this.view', this.view.toString())
		
		// JPEG with EXIF segment starts with App1 header (FF E1, length, 'Exif\0\0') and then follows the TIFF.
		// Whereas .tif file format starts with the TIFF structure right away.
		var marker = view.getUint16(0)
		if (marker === TIFF_LITTLE_ENDIAN || marker === TIFF_BIG_ENDIAN) {
			this.segments.push({
				start: 0,
				type: 'exif',
			})
		}

		let offset = 0
		let length = view.byteLength - 10 // No need to parse through till the end of the buffer.
		for (; offset < length; offset++) {
			if (view.getUint8(offset) === 0xFF
			&& (view.getUint8(offset + 1) & 0xF0) === 0xE0) {
				let type = getSegmentType(view, offset)
				if (type) {
					// known and parseable segment found
					let Parser = parserClasses[type]
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

		//console.log('segments', this.segments)
		//console.log('unknownSegments', this.unknownSegments)
	}

	async parse() {
		this.findAppSegments()
		await this.readSegments()
		this.createParsers()
		let libOutput = {}
		let promises = Object.values(this.parsers).map(async parser => {
			let parserOutput = await parser.parse()
			if (!this.options.mergeOutput || !parser.constructor.mergeOutput || typeof parserOutput === 'string')
				libOutput[parser.constructor.type] = parserOutput
			else
				Object.assign(libOutput, parserOutput)
			//console.log('parserOutput', parser.constructor.type, parserOutput)
		})
		await Promise.all(promises)
		console.log('libOutput', libOutput)
		return libOutput
	}

	async readSegments() {
		let promises = this.segments.map(async segment => {
			let {start, size} = segment
			if (this.view.chunked) {
				let available = this.view.isRangeAvailable(start, size || MAX_APP_SIZE)
				if (available) {
					segment.chunk = this.view.subarray(start, size)
				} else {
					try {
						segment.chunk = await this.view.readChunk(start, size || MAX_APP_SIZE)
					} catch (err) {
						throw new Error(`Couldn't read segment ${segment.type} at ${segment.offset}/${segment.size}. ${err.message}`)
					}
				}
			} else if (this.view.byteLength < start + size) {
				throw new Error(`Segment ${segment.type} at ${segment.offset}/${segment.size} is unreachable ` + JSON.stringify(segment))
			}
		})
		await Promise.all(promises)
	}

	// NOTE: This method was created to be reusable and not just one off. Mainly due to parsing ifd0 before thumbnail extraction.
	//       But also because we want to enable advanced users selectively add and execute parser on the fly.
	async createParsers() {
		if (this.options.tiff && !parserClasses.tiff) throw new Error('TIFF Parser was not loaded, try using full build of exifr.')
		if (this.options.iptc && !parserClasses.iptc) throw new Error('IPTC Parser was not loaded, try using full build of exifr.')
		if (this.options.icc  && !parserClasses.icc)  throw new Error('ICC Parser was not loaded, try using full build of exifr.')
		if (this.options.xmp  && !parserClasses.xmp)  throw new Error('XMP Parser was not loaded, try using full build of exifr.')

		// IDEA: dynamic loading through import(parser.type) ???
		//       We would need to know the type of segment, but we dont since its implemented in parser itself.
		//       I.E. Unless we first load apropriate parser, the segment is of unknown type.
		this.parsers = this.parsers || {}

		for (let position of this.segments) {
			let type = position.type
			console.log(type, position.start, position.size, this.options[type])
			if (this.options[type] !== true) continue
			let chunk = this.view.subarray(position.start, position.size)
			console.log(type, chunk.toString())
			let parser = this.parsers[type]
			if (parser && parser.append) {
				// TODO: to be implemented. or deleted. some types of data may be split into multiple APP segments (FLIR, maybe ICC)
				parser.append(chunk)
			} else if (!parser) {
				let Parser = parserClasses[type]
				let parser = new Parser(chunk, this.options)
				this.parsers[type] = parser
			}
		}
	}

}

export var ExifParser = Exifr
