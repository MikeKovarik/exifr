import Reader from './reader.js'
import {TAG_XMP, TAG_IPTC, TAG_ICC} from './tags.js'
import {BufferView} from './util/BufferView.js'
import {AppSegment, parsers as parserClasses} from './parsers/core.js'
import './parsers/tiff.js'
import './parsers/jfif.js'
import './parsers/iptc.js'
import './parsers/icc.js'
import './parsers/xmp.js'
import {TIFF_LITTLE_ENDIAN, TIFF_BIG_ENDIAN} from './parsers/tiff.js'
import {undefinedIfEmpty} from './util/helpers.js'

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

function getParserClass(options, type) {
	if (options[type] && !parserClasses[type])
		throw new Error(`${type} parser was not loaded, try using full build of exifr.`)
	else
		return parserClasses[type]
}

// First argument can be Node's Buffer or Web's DataView instance.
// Takes chunk of file and tries to find EXIF (it usually starts inside the chunk, but is much larger).
// Returns location {start, size, end} of the EXIF in the file not the input chunk itself.


class FileBase {

	constructor(options, file, parsers) {
		this.options = options
		this.file = file
		this.parsers = parsers
	}

	createParser(type, chunk) {
		let Parser = parserClasses[type]
		let parser = new Parser(chunk, this.options, this.file)
		return this.parsers[type] = parser
	}

	ensureSegmentChunk = async seg => {
		//global.recordBenchTime(`exifr.ensureSegmentChunk(${seg.type})`)
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
					throw new Error(`Couldn't read segment: ${JSON.stringify(seg)}. ${err.message}`)
				}
			}
		} else if (this.file.byteLength > start + size) {
			seg.chunk = this.file.subarray(start, size)
		} else if (seg.size === undefined) {
			// we dont know the length of segment and the file is much smaller than the fallback size of 64kbs (MAX_APP_SIZE)
			seg.chunk = this.file.subarray(start)
		} else {
			throw new Error(`Segment unreachable: ` + JSON.stringify(seg))
		}
		return seg.chunk
	}

}



class JpegFileParser extends FileBase {

	appSegments = []
	jpgSegments = []
	unknownSegments = []

	async parse() {
		//global.recordBenchTime(`exifr.parse()`)
		this.findAppSegments()
		await this.readSegments()
		this.createParsers()
	}

	async readSegments() {
		//global.recordBenchTime(`exifr.readSegments()`)
		let promises = this.appSegments.map(this.ensureSegmentChunk)
		await Promise.all(promises)
	}

	findAppSegments(offset = 0, wantedSegments) {
		//global.recordBenchTime(`exifr.findAppSegments()`)
		let findAll
		let wantedParsers = new Map
		let remainingSegments
		if (wantedSegments === true) {
			findAll = true
		} else {
			if (wantedSegments === undefined)
				wantedSegments = Object.keys(parserClasses).filter(key => this.options[key])
			findAll = false
			for (let type of wantedSegments)
				wantedParsers.set(type, parserClasses[type])
			remainingSegments = new Set(wantedSegments)
		}
		let file = this.file
		let bytes = file.byteLength - 10 // No need to parse through till the end of the buffer.
		for (; offset < bytes; offset++) {
			if (file.getUint8(offset) !== MARKER_1) continue
			// Reading uint8 instead of uint16 to prevent re-reading subsequent bytes.
			let marker2 = file.getUint8(offset + 1)
			let isAppSegment = isAppMarker(marker2)
			let isJpgSegment = isJpgMarker(marker2)
			// All JPG 
			if (!isAppSegment && !isJpgSegment) continue
			let length = file.getUint16(offset + 2)
			if (isAppSegment) {
				let type = getSegmentType(file, offset)
				if (type && wantedParsers.has(type)) {
					// known and parseable segment found
					let Parser = wantedParsers.get(type)
					let seg = Parser.findPosition(file, offset)
					seg.type = type
					this.appSegments.push(seg)
					if (!findAll) {
						remainingSegments.delete(type)
						if (remainingSegments.size === 0) break
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
		//global.recordBenchTime(`segments found`)
	}

	// NOTE: This method was created to be reusable and not just one off. Mainly due to parsing ifd0 before thumbnail extraction.
	//       But also because we want to enable advanced users selectively add and execute parser on the fly.
	async createParsers() {
		//global.recordBenchTime(`exifr.createParsers()`)
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
				let Parser = getParserClass(this.options, type)
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

}

class TiffFileParser extends FileBase {

	async parse() {
		if (this.options.xmp) this.options.addPick('ifd0', [TAG_XMP], false)
		if (this.options.iptc) this.options.addPick('ifd0', [TAG_IPTC], false)
		if (this.options.icc) this.options.addPick('ifd0', [TAG_ICC], false)
		//if (this.options.photoshop) this.options.addPick('ifd0', [TAG_PHOTOSHOP], false)

		if (this.options.tiff || this.options.xmp || this.options.iptc) {
			// The file starts with TIFF structure (instead of JPEGs FF D8)
			// Why XMP?: .tif files store XMP as ApplicationNotes tag in TIFF structure.
			let seg = {start: 0, type: 'tiff'}
			let chunk = await this.ensureSegmentChunk(seg)
			if (chunk === undefined) throw new Error(`Couldn't read chunk`)
			this.createParser('tiff', chunk)
			this.parsers.tiff.parseHeader()
			await this.parsers.tiff.parseIfd0Block()

			this.adaptTiffPropAsSegment('xmp')
			this.adaptTiffPropAsSegment('iptc')
			this.adaptTiffPropAsSegment('icc')
		}
	}

	adaptTiffPropAsSegment(key) {
		if (this.parsers.tiff[key]) {
			let rawData = this.parsers.tiff[key]
			let chunk = BufferView.from(rawData)
			if (this.options[key])
				this.createParser(key, chunk)
			else
				this.createDummyParser(key, chunk.getString())
		}
	}

	createDummyParser = (type, output) => {
		this.parsers[type] = {
			constructor: {type},
			parse: () => output,
		}
	}

}

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

	init() {
		//global.recordBenchTime(`exifr.parse()`)
		if (this.fileParser) return
		// JPEG's exif is based on TIFF structure from .tif files.
		// .tif files start with either 49 49 (LE) or 4D 4D (BE) which is also header for the TIFF structure.
		// JPEG starts with with FF D8, followed by APP0 and APP1 section (FF E1 + length + 'Exif\0\0' + data) which contains the TIFF structure (49 49 / 4D 4D + data)
		var marker = this.file.getUint16(0)
		this.file.isTiff = marker === TIFF_LITTLE_ENDIAN || marker === TIFF_BIG_ENDIAN
		//this.isJpeg = marker === JPEG_SOI
		let FileParser = this.file.isTiff ? TiffFileParser : JpegFileParser
		this.fileParser = new FileParser(this.options, this.file, this.parsers)
	}

	async parse() {
		this.init()
		await this.fileParser.parse()
		let output = await this.createOutput()
		if (this.file.destroy) /*await*/ this.file.destroy()
		return output
	}

	// todo: move this logic to parse
	async createOutput() {
		//global.recordBenchTime(`exifr.createOutput()`)
		let libOutput = {}
		let {mergeOutput} = this.options
		let promises = Object.values(this.parsers).map(async parser => {
			let parserOutput = await parser.parse()
			if ((mergeOutput || parser.constructor.mergeOutput) && typeof parserOutput !== 'string')
				Object.assign(libOutput, parserOutput)
			else
				libOutput[parser.constructor.type] = parserOutput
		})
		await Promise.all(promises)
		return undefinedIfEmpty(libOutput)
	}

	async extractThumbnail() {
		this.init()
		let TiffParser = getParserClass(this.options, 'tiff')
		if (this.file.isTiff)
			var seg = {start: 0, type: 'tiff'}
		else
			var seg = this.fileParser.getOrFindSegment('tiff')
		if (seg === undefined) return
		let chunk = await this.fileParser.ensureSegmentChunk(seg)
		let parser = this.parsers.tiff = new TiffParser(chunk, this.options, this.file)
		return parser.extractThumbnail()
	}

}

export var ExifParser = Exifr
