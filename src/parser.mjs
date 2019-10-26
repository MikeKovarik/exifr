import Reader from './reader.mjs'
import * as tags from './tags.mjs'
import {
	getUint8,
	getUint16,
	getUint32,
	getInt8,
	getInt16,
	getInt32,
	slice,
	toString,
	BufferCursor
} from './buff-util.mjs'

const SIZE_LOOKUP = {
	1: 1, // BYTE      - 8-bit unsigned integer
	2: 1, // ASCII     - 8-bit bytes w/ last byte null
	3: 2, // SHORT     - 16-bit unsigned integer
	4: 4, // LONG      - 32-bit unsigned integer
	5: 8, // RATIONAL  - 64-bit unsigned fraction
	6: 1, // SBYTE     - 8-bit signed integer
	7: 1, // UNDEFINED - 8-bit untyped data
	8: 2, // SSHORT    - 16-bit signed integer
	9: 4, // SLONG     - 32-bit signed integer
	10: 8, // SRATIONAL - 64-bit signed fraction (Two 32-bit signed integers)
	11: 4, // FLOAT,    - 32-bit IEEE floating point
	12: 8, // DOUBLE    - 64-bit IEEE floating point
	// https://sno.phy.queensu.ca/~phil/exiftool/standards.html
	13: 4 // IFD (sometimes used instead of 4 LONG)
}

// TODO: disable/enable tags dictionary
// TODO: public tags dictionary. user can define what he needs and uses 

const THUMB_OFFSET = 0x0201
const THUMB_LENGTH = 0x0202
const IFD_EXIF     = 0x8769
const IFD_INTEROP  = 0xA005
const IFD_GPS      = 0x8825
//const THUMB_OFFSET = 'ThumbnailOffset'
//const THUMB_LENGTH = 'ThumbnailLength'
//const IFD_EXIF     = 'ExifIFDPointer'
//const IFD_INTEROP  = 'InteroperabilityIFDPointer'
//const IFD_GPS      = 'GPSInfoIFDPointer'

const TIFF_LITTLE_ENDIAN = 0x4949
const TIFF_BIG_ENDIAN =	0x4D4D

class AppSegment {

	//static headerLength = 4 // todo: fix this when rollup support class properties

	static canHandle() {return false}

	constructor(buffer, position, options) {
		Object.assign(this, position)
		this.buffer = buffer
		this.options = options
	}

	// offset + length === end  |  begining and end of the whole segment, including the segment header 0xFF 0xEn + two lenght bytes.
	// start  + size   === end  |  begining and end of parseable content
	static parsePosition(buffer, offset) {
		// length at offset+2 is the size of appN content plus the two appN length bytes. it does not include te appN 0xFF 0xEn marker.
		var length = getUint16(buffer, offset + 2) + 2
		var start = offset + this.headerLength
		var size = length - this.headerLength
		var end = start + size
		return {offset, length, start, size, end}
	}

}
AppSegment.headerLength = 4 // todo: fix this when rollup support class properties





export class Jfif extends AppSegment {

	//static headerLength = 9 // todo: fix this when rollup support class properties

	static canHandle(buffer, offset) {
		return getUint8(buffer, offset + 1) === 0xE0
			&& getUint32(buffer, offset + 4) === 0x4A464946 // 'JFIF'
			&& getUint8(buffer, offset + 8) === 0x00       // followed by '\0'
	}

	parse() {
		this.bc = new BufferCursor(this.buffer, this.start)
		let jfif = {
			version:    this.bc.getUint16(),
			units:      this.bc.getUint8(),
			Xdensity:   this.bc.getUint16(),
			Ydensity:   this.bc.getUint16(),
			Xthumbnail: this.bc.getUint8(),
			Ythumbnail: this.bc.getUint8(),
		}
		this.output = this.options.mergeOutput ? {jfif} : jfif
		return this.output
	}

	static prettify(jfif) {
		let versionInt = jfif.version
		jfif.version = ((versionInt & 0xFF00) >> 8).toString(16) + '.' + (versionInt & 0x00FF).toString(16).padStart(2, '0')
		jfif.units = jfif.units === 2 ? 'cm' : jfif.units === 1 ? 'inches' : jfif.units
		return jfif
	}

}
Jfif.headerLength = 9 // todo: fix this when rollup support class properties






export class Iptc extends AppSegment {

	parse() {
		let iptc = {}
		var offset = this.start
		for (var offset = 0; offset < this.end; offset++) {
			// reading Uint8 and then another to prevent unnecessarry read of two subsequent bytes, when iterating
			if (getUint8(this.buffer, offset) === 0x1C && getUint8(this.buffer, offset + 1) === 0x02) {
				let size = getInt16(this.buffer, offset + 3)
				let tag = getUint8(this.buffer, offset + 2)
				let key = tags.iptc[tag] || tag // TODO: translate tags on demand
				let val = toString(this.buffer, offset + 5, offset + 5 + size)
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
				var nameHeaderLength = getUint8(buffer, offset + 7)
				if (nameHeaderLength % 2 !== 0)
					nameHeaderLength += 1
				// Check for pre photoshop 6 format
				if (nameHeaderLength === 0)
					nameHeaderLength = 4
				var start = offset + 8 + nameHeaderLength
				var size = getUint16(buffer, offset + 6 + nameHeaderLength)
				var end = start + size
				return {start, size, end}
			}
		}
	}

	isIptcSegmentHead(buffer, offset) {
		return getUint8(buffer, offset)     === 0x38
			&& getUint8(buffer, offset + 1) === 0x42
			&& getUint8(buffer, offset + 2) === 0x49
			&& getUint8(buffer, offset + 3) === 0x4D
			&& getUint8(buffer, offset + 4) === 0x04
			&& getUint8(buffer, offset + 5) === 0x04
	}
*/
}



//<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="XMP Core 5.6.0"></x>
// XMPToolkit
class Xmp extends AppSegment {

	static canHandle(buffer, offset) {
		return getUint8(buffer, offset + 1) === 0xE1
			&& getUint32(buffer, offset + 4) === 0x68747470 // 'http'
	}
/*
	// TODO: check & calculate the values are correct
	static parsePosition(buffer, offset) {
		var length = getUint16(buffer, offset + 2)
		var start = offset + 4
		var size = getUint16(buffer, offset + 2) - 2
		var end = start + size
		return {offset, start, size, end}
	}
*/
	constructor(buffer, position, options) {
		super()
		Object.assign(this, position)
		this.buffer = buffer
		this.options = options
	}

	parse() {
		// Read XMP segment as string. We're not parsing the XML.
		let string = toString(this.buffer, this.start, this.end)
		// Trims the mess around.
		if (this.options.postProcess || this.parseXml) {
			let start = string.indexOf('<x:xmpmeta')
			let end = string.indexOf('x:xmpmeta>') + 10
			string = string.slice(start, end)
			// offer user to supply custom xml parser
			if (this.parseXml) return this.parseXml(string)
		}
		// TO BE FURTHER DEVELOPED IF/WHEN XMP/XML PARSER IS IMPLEMENTED
		//this.output = this.options.mergeOutput ? {xmp} : xmp
		this.output = {xmp: string}
		return this.output
	}

	//parseXml() {}

}







// jpg wraps tiff into app1 segment.
export class Tiff extends AppSegment {

	parseHeader() {
		// Detect endian 11th byte of TIFF (1st after header)
		var byteOrder = getUint16(this.buffer, this.start)
		if (byteOrder === TIFF_LITTLE_ENDIAN)
			this.le = true // little endian
		else if (byteOrder === TIFF_BIG_ENDIAN)
			this.le = false // big endian
		else
			throw new Error('Invalid EXIF data: expected byte order marker (0x4949 or 0x4D4D).')

		// Bytes 8 & 9 are expected to be 00 2A.
		if (getUint16(this.buffer, this.start + 2, this.le) !== 0x002A)
			throw new Error('Invalid EXIF data: expected 0x002A.')

		this.ifd0Offset = getUint32(this.buffer, this.start + 4, this.le)
	}

	parseTags(chunk, offset = this.buffer) {
		var entriesCount = getUint16(chunk, offset, this.le)
		offset += 2
		var output = {}
		for (var i = 0; i < entriesCount; i++) {
			var tag = getUint16(chunk, offset, this.le)
			var val = this.parseTag(offset, chunk)
			//console.log(`${i} / ${entriesCount} |`, offset, '|', tag, key, val)
			output[tag] = val
			offset += 12
		}
		return output
	}

	parseTag(offset, chunk = this.buffer) {
		var type = getUint16(chunk, offset + 2, this.le)
		var valuesCount = getUint32(chunk, offset + 4, this.le)
		var valueByteSize = SIZE_LOOKUP[type]
		if (valueByteSize * valuesCount <= 4)
			var valueOffset = offset + 8
		else
			var valueOffset = this.start + getUint32(chunk, offset + 8, this.le)

		if (valueOffset > chunk.buffer.byteLength)
			throw new Error(`tiff value offset ${valueOffset} is out of chunk size ${chunk.buffer.byteLength}`)

		// ascii strings, array of 8bits/1byte values.
		if (type === 2) {
			var end = valueOffset + valuesCount
			var string = toString(chunk, valueOffset, end)
			if (string.endsWith('\0')) // remove null terminator
				return string.slice(0, -1)
			return string
		}

		// undefined/buffers of 8bit/1byte values.
		if (type === 7)
			return slice(chunk, valueOffset, valueOffset + valuesCount)

		// Now that special cases are solved, we can return the normal uint/int value(s).
		if (valuesCount === 1) {
			// Return single value.
			return this.parseTagValue(type, valueOffset, chunk)
		} else {
			// Return array of values.
			var res = []
			for (var i = 0; i < valuesCount; i++) {
				res.push(this.parseTagValue(type, valueOffset, chunk))
				valueOffset += valueByteSize
			}
			return res
		}
	}

	parseTagValue(type, offset, chunk) {
		switch (type) {
			case 1:  return getUint8(chunk, offset)
			case 3:  return getUint16(chunk, offset, this.le)
			case 4:  return getUint32(chunk, offset, this.le)
			case 5:  return getUint32(chunk, offset, this.le) / getUint32(chunk, offset + 4, this.le)
			case 6:  return getInt8(chunk, offset)
			case 8:  return getInt16(chunk, offset, this.le)
			case 9:  return getInt32(chunk, offset, this.le)
			case 10: return getInt32(chunk, offset, this.le) / getInt32(chunk, offset + 4, this.le)
			//case 11: return getFloat()  // TODO: buffer.readFloatBE() buffer.readFloatLE()
			//case 12: return getDouble() // TODO: buffer.readDoubleBE() buffer.readDoubleLE()
			case 13: return getUint32(chunk, offset, this.le)
			default: throw new Error(`Invalid tiff type ${type}`)
		}
	}

}










// Exif App1 segment wraps tiff structure inside.
// JPEG with EXIF segment starts with App1 header (FF E1, length, 'Exif\0\0') and then follows the TIFF
// .tif file format starts with the TIFF structure right away
export class Exif extends Tiff {

	//static headerLength = 10 // todo: fix this when rollup support class properties

	static canHandle(buffer, offset) {
		return getUint8(buffer, offset + 1) === 0xE1
			&& getUint32(buffer, offset + 4) === 0x45786966 // 'Exif'
			&& getUint16(buffer, offset + 8) === 0x0000     // followed by '\0'
	}

	async parse() {
		this.parseHeader()
		await this.parseIfd0Block()                                  // APP1 - IFD0
		if (this.options.exif)      await this.parseExifBlock()      // APP1 - EXIF IFD
		if (this.options.gps)       await this.parseGpsBlock()       // APP1 - GPS IFD
		if (this.options.interop)   await this.parseInteropBlock()   // APP1 - Interop IFD
		if (this.options.thumbnail) await this.parseThumbnailBlock() // APP1 - IFD1
		let {image, exif, gps, interop, thumbnail} = this
		if (this.options.mergeOutput)
			this.output = Object.assign({}, image, exif, gps, interop, thumbnail)
		else
			this.output = {image, exif, gps, interop, thumbnail}
		return this.output
	}

	async parseIfd0Block() {
		// Read the IFD0 segment with basic info about the image
		// (width, height, maker, model and pointers to another segments)
		if (this.ifd0Offset < 8)
			throw new Error('Invalid EXIF data: IFD0 offset should be less than 8')
		var ifd0 = await this.parseTags(this.start + this.ifd0Offset)

		// Cancel if the ifd0 is empty (imaged created from scratch in photoshop).
		if (Object.keys(ifd0).length === 0) return

		this.exifOffset    = ifd0[IFD_EXIF]
		this.interopOffset = ifd0[IFD_INTEROP]
		this.gpsOffset     = ifd0[IFD_GPS]

		this.imageRaw = ifd0
		// IFD0 segment also contains offset pointers to another segments deeper within the EXIF.
		// User doesn't need to see this. But we're sanitizing it only if options.postProcess is enabled.
		if (this.options.postProcess) {
			delete this.imageRaw[IFD_EXIF]
			delete this.imageRaw[IFD_INTEROP]
			delete this.imageRaw[IFD_GPS]
		}
		this.image = this.translateBlock(this.imageRaw, tags.exif)
	}

	// EXIF block of TIFF of APP1 segment
	// 0x8769
	async parseExifBlock() {
		if (this.exifOffset === undefined) return
		this.exifRaw = await this.parseTags(this.start + this.exifOffset)
		this.exif = this.translateBlock(this.exifRaw, tags.exif)
	}

	// GPS block of TIFF of APP1 segment
	// 0x8825
	async parseGpsBlock() {
		if (this.gpsOffset === undefined) return
		this.gpsRaw = await this.parseTags(this.start + this.gpsOffset)
		this.gps = this.translateBlock(this.gpsRaw, tags.gps)
		let gps = this.gps
		// Add custom timestamp property as a mixture of GPSDateStamp and GPSTimeStamp
		if (this.options.postProcess) {
			if (gps.GPSDateStamp && gps.GPSTimeStamp)
				gps.timestamp = reviveDate(gps.GPSDateStamp + ' ' + gps.GPSTimeStamp)
			if (gps && gps.GPSLatitude) {
				gps.latitude  = ConvertDMSToDD(...gps.GPSLatitude, gps.GPSLatitudeRef)
				gps.longitude = ConvertDMSToDD(...gps.GPSLongitude, gps.GPSLongitudeRef)
			}
		}
	}

	// INTEROP block of TIFF of APP1 segment
	// 0xA005
	async parseInteropBlock() {
		//if (!this.options.interop) return
		this.interopOffset = this.interopOffset || (this.exifRaw && this.exifRaw[IFD_INTEROP])
		if (this.interopOffset === undefined) return
		this.interopRaw = await this.parseTags(this.start + this.interopOffset)
		this.interop = this.translateBlock(this.interopRaw, tags.exif)
	}

	// THUMBNAIL block of TIFF of APP1 segment
	// returns boolean "does the file contain thumbnail"
	async parseThumbnailBlock(force = false) {
		if (this.thumbnailParsed) return true
		if (force === false && this.options.mergeOutput) return false
		let ifd0Entries = getUint16(this.buffer, this.start + this.ifd0Offset, this.le)
		let temp = this.start + this.ifd0Offset + 2 + (ifd0Entries * 12)
		this.ifd1Offset = getUint32(this.buffer, temp, this.le)
		// IFD1 offset is number of bytes from start of TIFF header where thumbnail info is.
		if (this.ifd1Offset === 0) return false
		this.thumbnailRaw = await this.parseTags(this.start + this.ifd1Offset)
		this.thumbnail = this.translateBlock(this.thumbnailRaw, tags.exif)
		this.thumbnailParsed = true
		return true
	}

	async parseTags(offset) {
		// TODO: re-read file if portion of the exif is outside of read chunk
		// (test/001.tif has tiff segment at the beggining plus at the end)
		if (offset > this.buffer.byteLength) {
			if (this.mode === 'chunked') {
				var chunk = await this.reader.readChunk({
					start: offset,
					size: 10000,
				})
				offset = 0
			} else {
				throw new Error(`segment offset ${offset} is out of chunk size ${this.buffer.byteLength}`)
			}
		} else {
			var chunk = this.buffer
		}
		//console.log('---')
		//console.log('offset', offset)
		//console.log('chunk', chunk.slice(offset))
		return super.parseTags(chunk, offset)
	}

	translateBlock(raw, tagNames) {
		if (this.options.postProcess || this.options.translateTags) {
			// TODO: do two passes of transforming.
			// 1) manipulate value
			// 2) use string key instead of tag number.
			// add translateTags option,
			// rename postProcess to postProcess
			let entries = Object.entries(raw)
				.map(([tag, val]) => {
					var key = tagNames[tag] || tag
					return [key, translateValue(key, val)]
				})
			return Object.fromEntries(entries)
		}
		return raw hovinko je fuj.
	}

}
Exif.headerLength = 10 // todo: fix this when rollup support class properties




// First argument can be Node's Buffer or Web's DataView instance.
// Takes chunk of file and tries to find EXIF (it usually starts inside the chunk, but is much larger).
// Returns location {start, size, end} of the EXIF in the file not the input chunk itself.

let allParserClasses = [Jfif, Exif, Xmp, Iptc]

for (let Parser of allParserClasses) {
	Parser.type = Parser.name.toLowerCase()
	allParserClasses[Parser.type] = Parser
}

/*
offset = where FF En starts
length = size of the appN header (FF En, lentgth, signature) + content size. i.e. from offset till end
start  = start of the content
size   = size of the content. i.e. from start till end
end    = end of the content (as well as the appN segment)
*/



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
		console.log('ExifParser')
		super(...args)
		this.pos = {}

		this.requiredParsers = allParserClasses.filter(Parser => !!this.options[Parser.type])
		console.log('allParserClasses', allParserClasses)
		console.log('requiredParsers', this.requiredParsers)
		console.log('options', this.options)
	}

	// TODO: Some images don't have any exif but they do have XMP burried somewhere
	// TODO: Add API to allow this. something like bruteForce: false
	async read(arg) {
		console.log('read 1', arg)
		//console.log('ExifParser read', arg)
		console.log('read 2')
		this.buffer = await super.read(arg)
		console.log('read 3')
		console.log('this.buffer', this.buffer)
		if (this.buffer === undefined) {
			throw new Error('buffer is undefined, not enough file read? maybe file wasnt read at all')
		}
		console.log('read 4')
		this.findAppSegments()
		console.log('read 5')
	}

	findAppSegments(offset = 0) {
		console.log('findAppSegments')
		let buffer = this.buffer
		let length = (buffer.length || buffer.byteLength) - 10
		this.segments = []
		this.unknownSegments = []
		console.log('length', length)
		
		var marker = getUint16(buffer, 0)
		if (marker === TIFF_LITTLE_ENDIAN || marker === TIFF_BIG_ENDIAN) {
			this.segments.push({
				start: 0,
				type: 'exif',
			})
		}

		for (; offset < length; offset++) {
			if (getUint8(buffer, offset) === 0xFF
			&& (getUint8(buffer, offset + 1) & 0xF0) === 0xE0) {
				//console.log('--- segment candidate -------')
				//console.log('offset', offset)
				let type = this.getSegmentType(buffer, offset)
				//console.log('type', type)
				if (type) {
					// known and parseable segment found
					//console.log('type', type)
					let Parser = allParserClasses[type]
					let position = Parser.parsePosition(buffer, offset)
					position.type = type
					this.segments.push(position)
					if (position.end)
						offset = position.end - 1
					else if (position.length)
						offset += position.length - 1
				} else {
					// either unknown/supported appN segment or just a noise.
					let position = AppSegment.parsePosition(buffer, offset)
					this.unknownSegments.push(position)
				}
			}
		}

		console.log('segments', this.segments)
		console.log('unknownSegments', this.unknownSegments)
	}

	getSegmentType(buffer, offset) {
		for (let Parser of allParserClasses) {
			if (Parser.canHandle(buffer, offset)) return Parser.type
		}
	}

	async parse() {

		this.parsers = {}

		let output = {}

		let promises = this.segments
			.filter(segment => !!this.options[segment.type])
			.map(async segment => {
				//console.log('---------------------------------------------------------')
				//console.log(segment.type)
				//var full = this.buffer.slice(segment.offset, segment.end)
				//console.log('full   ', full.length.toString().padStart(2, ' '), full)
				//let string = toString(this.buffer, segment.start, segment.end)
				//console.log('string', string)
				let Parser = allParserClasses[segment.type]
				let parser = new Parser(this.buffer, segment, this.options)
				this.parsers[segment.type] = parser
				await parser.parse()
				if (!this.options.mergeOutput || typeof parser.output === 'string')
					output[segment.type] = parser.output
				else
					Object.assign(output, parser.output)
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

	// .tif files do no have any APPn segments. and usually start right with TIFF header
	// .jpg files can have multiple APPn segments. They always have APP1 whic is a wrapper for TIFF.
	// APP1 includes TIFF formatted values, grouped into IFD blocks (IFD0, Exif, Interop, GPS, IFD1)

	// APP1 HEADER:
	// - FF E1 - segment marker
	// - 2Bytes - segment length
	// - 45 78 69 66 00 00 - string 'Exif\0\0'
	// APP1 CONTENT:
	// - TIFF HEADER (2b byte order, 2b tiff id, 4b offset of ifd1)
	// - IFD0
	// - Exif IFD
	// - Interop IFD
	// - GPS IFD
	// - IFD1

/*
	async parse() {
		try {
			// Some images don't have any exif but they do have XMP burried somewhere
			// TODO: Add API to allow this. somethign like bruteForce: false
			// return undefined if file has no exif
			if (this.options.tiff && this.pos.tiff) await this.parseTiff() // The basic EXIF tags (image, exif, gps)
			if (this.options.xmp)  this.parseXmpSegment()  // Additional XML data (in XML)
			if (this.options.iptc) this.parseIptcSegment() // Captions and copyrights
			if (this.options.jfif) this.parseJfifSegment() // TODO
			//if (this.options.icc)  this.parseIccSegment()  // Image profile
		} catch (err) {
			console.error('Parsing failed', err)
		}
		// close FS file handle just in case it's still open
		if (this.reader) this.reader.destroy()

		let {image, exif, gps, interop, thumbnail, iptc, jfif} = this
		if (this.options.mergeOutput)
			var output = Object.assign({}, image, exif, gps, interop, thumbnail, iptc, jfif)
		else
			var output = {image, exif, gps, interop, thumbnail, iptc, jfif}
		if (this.xmp) output.xmp = this.xmp
		// Return undefined rather than empty object if there's no data.
		for (let key in output)
			if (output[key] === undefined)
				delete output[key]
		if (Object.keys(output).length === 0) return
		return output
	}
*/
	// We support both jpg and tiff so we're not looking for app1 segment but directly for tiff
	// because app1 in jpg is only container for tiff.
	async parseTiff() {
		if (this.tiffParsed) return
		this.tiffParsed = true
		// Cancel if the file doesn't contain the segment or if it's damaged.
		// This is not really TIFF segment. rather TIFF wrapped inside APP1 segment.
		this.tiffParser = new Exif(this.buffer, this.pos.tiff)
		return this.tiff = this.tiffParser.parse()
	}
/*
	parseXmpSegment() {
		let position = this.pos.xmp
		this.xmpParser = new Xmp(this.buffer, position, this.options)
		return this.xmp = this.xmpParser.parse()
	}

	parseJfifSegment() {
		let position = this.pos.jfif
		this.jfifParser = new Jfif(this.buffer, position, this.options)
		return this.jfif = this.jfifParser.parse()
	}

	// NOTE: This only works with single segment IPTC data.
	// TODO: Implement multi-segment parsing.
	parseIptcSegment() {
		let position = this.pos.iptc
		let validPosition = position.start && position.end
		if (!validPosition) return
		this.iptcParser = new Iptc(this.buffer, position, this.options)
		return this.iptc = this.iptcParser.parse()
	}
*/
}

export var ExifParser = Exifr

// Converts date string to Date instances, replaces enums with string descriptions
// and fixes values that are incorrectly treated as buffers.
function translateValue(key, val) {
	if (val === undefined || val === null)
		return undefined
	if (tags.dates.includes(key))
		return reviveDate(val)
	if (key === 'SceneType')
		return Array.from(val).map(v => tags.valueString.SceneType[v]).join(', ')
	if (key === 'ComponentsConfiguration')
		return Array.from(val).map(v => tags.valueString.Components[v]).join(', ')
	if (tags.valueString[key] !== undefined)
		return tags.valueString[key][val] || val
	if (key === 'FlashpixVersion' || key === 'ExifVersion')
		return toString(val)
	if (key === 'GPSVersionID')
		return Array.from(val).join('.')
	if (key === 'GPSTimeStamp')
		return Array.from(val).join(':')
	return val
}

function reviveDate(string) {
	if (typeof string !== 'string')
		return null
	string = string.trim()
	var [dateString, timeString] = string.split(' ')
	var [year, month, day] = dateString.split(':').map(Number)
	var date = new Date(year, month - 1, day)
	if (timeString) {
		var [hours, minutes, seconds] = timeString.split(':').map(Number)
		date.setHours(hours)
		date.setMinutes(minutes)
		date.setSeconds(seconds)
	}
	return date
}

function ConvertDMSToDD(degrees, minutes, seconds, direction) {
	var dd = degrees + (minutes / 60) + (seconds / (60*60))
	// Don't do anything for N or E
	if (direction == 'S' || direction == 'W')
		dd *= -1
	return dd
}
