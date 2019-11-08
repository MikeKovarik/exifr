import Reader from './reader.mjs'
import {tags} from './tags.mjs'
import {BufferView} from './util/BufferView.mjs'
import {AppSegment, parsers as parserClasses} from './parsers/core.mjs'
import './parsers/tiff.mjs'
import './parsers/jfif.mjs'
import './parsers/iptc.mjs'
import './parsers/icc.mjs'
import './parsers/xmp.mjs'
import {TIFF_LITTLE_ENDIAN, TIFF_BIG_ENDIAN} from './parsers/tiff.mjs'

// TODO: disable/enable tags dictionary
// TODO: public tags dictionary. user can define what he needs and uses 

const MAX_APP_SIZE = 65536 // 64kb

const JPEG_SOI = 0xffd8

const MARKER_1         = 0xff
const MARKER_2_APP0    = 0xe0 // ff e0
const MARKER_2_APP15   = 0xef // ff ef
const MARKER_2_SOF0    = 0xc0 // ff c0
const MARKER_2_SOF2    = 0xc2 // ff c2
const MARKER_2_DHT     = 0xc4 // ff c4
const MARKER_2_DQT     = 0xdb // ff db
const MARKER_2_DRI     = 0xdd // ff dd
const MARKER_2_SOS     = 0xda // ff da
const MARKER_2_COMMENT = 0xfe // ff fe

function isJpgMarker(marker2) {
	return marker2 === MARKER_2_SOF0
		|| marker2 === MARKER_2_SOF2
		|| marker2 === MARKER_2_DHT
		|| marker2 === MARKER_2_DQT
		|| marker2 === MARKER_2_DRI
		|| marker2 === MARKER_2_SOS
		|| marker2 === MARKER_2_COMMENT
}

function isAppMarker(marker2) {
    return marker2 >= MARKER_2_APP0
		&& marker2 <= MARKER_2_APP15
}

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

	parsers = {}
	appSegments = []
	jpgSegments = []
	unknownSegments = []

	init() {
		// JPEG's exif is based on TIFF structure from .tif files.
		// .tif files start with either 49 49 (LE) or 4D 4D (BE) which is also header for the TIFF structure.
		// JPEG starts with with FF D8, followed by APP0 and APP1 section (FF E1 + length + 'Exif\0\0' + data) which contains the TIFF structure (49 49 / 4D 4D + data)
		var marker = this.file.getUint16(0)
		this.isTiff = marker === TIFF_LITTLE_ENDIAN || marker === TIFF_BIG_ENDIAN
		//this.isJpeg = marker === JPEG_SOI
	}

	findAppSegments(offset = 0, wantedSegments = []) {
		//console.log('findAppSegments', wantedSegments)
		let wanted = new Set(wantedSegments)

		let file = this.file
		
		if (this.isTiff) {
			// The file starts with TIFF structure (instead of JPEGs FF D8)
			this.appSegments.push({start: 0, type: 'tiff'})
			//return // nejde preskocit. TIFF porad muze obsahovat XMP a dalsi (001.tif)
		}
		// NOTE: we're not immediatelly checking for this.isJpeg because we want to enable reading from any offset in the file
		// and be able to even insert malformed JPEG file.

		let bytes = file.byteLength - 10 // No need to parse through till the end of the buffer.
		for (; offset < bytes; offset++) {
			if (file.getUint8(offset) === MARKER_1) {
				// Reading uint8 instead of uint16 to prevent re-reading subsequent bytes.
				let marker2 = file.getUint8(offset + 1)
				let isAppSegment = isAppMarker(marker2)
				let isJpgSegment = isJpgMarker(marker2)
				// All JPG 
				if (isAppSegment || isJpgSegment) {
					let length = file.getUint16(offset + 2)
					if (isAppSegment) {
						let type = getSegmentType(file, offset)
						if (type) {
							// known and parseable segment found
							let Parser = parserClasses[type]
							let seg = Parser.findPosition(file, offset)
							seg.type = type
							if (wanted.size === 0) {
								this.appSegments.push(seg)
							} else if (wanted.size > 0 && wanted.has(type)) {
								this.appSegments.push(seg)
								wanted.delete(type)
								if (wanted.size === 0) break
							}
						} else {
							// either unknown/supported appN segment or just a noise.
							let seg = AppSegment.findPosition(file, offset)
							this.unknownSegments.push(seg)
						}
					} else if (isJpgSegment) {
						this.jpgSegments.push({offset, length})
					}
					offset += length + 1
				}
			}
		}
	}

	async parse() {
		this.init()
		this.findAppSegments()
		await this.readSegments()
		this.createParsers()
		let libOutput = {}
		let promises = Object.values(this.parsers).map(async parser => {
			let parserOutput = await parser.parse()
			//if (this.options.mergeOutput || parser.constructor.mergeOutput || typeof parserOutput !== 'string')
			if (this.options.mergeOutput || parser.constructor.mergeOutput)
				Object.assign(libOutput, parserOutput)
			else
				libOutput[parser.constructor.type] = parserOutput
		})
		await Promise.all(promises)
		return libOutput
	}

	async readSegments() {
		//console.log('readSegments')
		//console.log('this.appSegments', this.appSegments)
		let promises = this.appSegments.map(this.ensureSegmentChunk)
		await Promise.all(promises)
	}

	ensureSegmentChunk = async seg => {
		let start = seg.start
		let size = seg.size || MAX_APP_SIZE
		if (this.file.chunked) {
			let available = this.file.isRangeAvailable(start, size)
			if (available) {
				seg.chunk = this.file.subarray(start, size)
			} else {
				try {
					seg.chunk = await this.file.readChunk(start, size)
				} catch (err) {
					throw new Error(`Couldn't read segment ${seg.type} at ${seg.offset}/${seg.size}. ${err.message}`)
				}
			}
		} else if (this.file.byteLength > start + size) {
			seg.chunk = this.file.subarray(start, size)
		} else {
			throw new Error(`Segment ${seg.type} at ${seg.offset}/${seg.size} is unreachable ` + JSON.stringify(seg))
		}
		return seg.chunk
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
		for (let segment of this.appSegments) {
			let {type, chunk} = segment
			if (this.options[type] !== true) continue
			let parser = this.parsers[type]
			if (parser && parser.append) {
				// TODO: to be implemented. or deleted. some types of data may be split into multiple APP segments (FLIR, maybe ICC)
				parser.append(chunk)
			} else if (!parser) {
				let Parser = parserClasses[type]
				let parser = new Parser(chunk, this.options, this.file)
				this.parsers[type] = parser
			}
		}
	}

	getSegment(type) {
		return this.appSegments.find(seg => seg.type === type)
	}

	getOrFindSegment(type) {
		let seg = this.getSegment(type)
		if (seg === undefined) {
			this.findAppSegments(0, [type])
			seg = this.getSegment(type)
		}
		return seg
	}

	async extractThumbnail() {
		if (this.options.tiff && !parserClasses.tiff) throw new Error('TIFF Parser was not loaded, try using full build of exifr.')
		let seg = this.getOrFindSegment('tiff')
		if (seg !== undefined) {
			let chunk = await this.ensureSegmentChunk(seg)
			this.parsers.tiff = new parserClasses.tiff(chunk, this.options, this.file)
			return this.parsers.tiff.extractThumbnail()
		}
	}

}

export var ExifParser = Exifr
