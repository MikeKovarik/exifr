import Reader from './reader.js'
import {segmentParsers, getParserClass} from './segment-parsers/core.js'
import {TIFF_LITTLE_ENDIAN, TIFF_BIG_ENDIAN} from './segment-parsers/tiff.js'
import {undefinedIfEmpty} from './util/helpers.js'
import {TiffFileParser} from './file-parsers/tif.js'
import {JpegFileParser} from './file-parsers/jpg.js'

// TODO: disable/enable tags dictionary
// TODO: public tags dictionary. user can define what he needs and uses 

const JPEG_SOI = 0xffd8

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

	setup() {
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
		this.setup()
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
		this.setup()
		let TiffParser = getParserClass(this.options, 'tiff')
		if (this.file.isTiff)
			var seg = {start: 0, type: 'tiff'}
		else
			var seg = await this.fileParser.getOrFindSegment('tiff')
		if (seg === undefined) return
		let chunk = await this.fileParser.ensureSegmentChunk(seg)
		let parser = this.parsers.tiff = new TiffParser(chunk, this.options, this.file)
		return parser.extractThumbnail()
	}

}

export var ExifParser = Exifr
