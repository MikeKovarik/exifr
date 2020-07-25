import {AppSegmentParserBase} from '../parser.mjs'
import {segmentParsers} from '../plugins.mjs'
import {TAG_IFD_EXIF, TAG_IFD_GPS, TAG_IFD_INTEROP, TAG_MAKERNOTE, TAG_USERCOMMENT, TAG_XMP, TAG_IPTC, TAG_ICC} from '../tags.mjs'
import {TAG_GPS_LATREF, TAG_GPS_LAT, TAG_GPS_LONREF, TAG_GPS_LON} from '../tags.mjs'
import {TIFF_LITTLE_ENDIAN, TIFF_BIG_ENDIAN} from '../util/helpers.mjs'
import {isEmpty, normalizeString} from '../util/helpers.mjs'
import {throwError, estimateMetadataSize} from '../util/helpers.mjs'
import {tiffBlocks} from '../options.mjs'


const MALFORMED = 'Malformed EXIF data'

const THUMB_OFFSET = 0x0201
const THUMB_LENGTH = 0x0202

const BYTE      = 1
const ASCII     = 2
const SHORT     = 3
const LONG      = 4
const RATIONAL  = 5
const SBYTE     = 6
const UNDEFINED = 7
const SSHORT    = 8
const SLONG     = 9
const SRATIONAL = 10
const FLOAT     = 11
const DOUBLE    = 12
const IFD       = 13

const SIZE_LOOKUP = [
	undefined, // nothing at index 0
	1, // BYTE      - 8-bit unsigned integer
	1, // ASCII     - 8-bit bytes w/ last byte null
	2, // SHORT     - 16-bit unsigned integer
	4, // LONG      - 32-bit unsigned integer
	8, // RATIONAL  - 64-bit unsigned fraction of two 32-bit unsigned integers
	1, // SBYTE     - 8-bit signed integer
	1, // UNDEFINED - 8-bit untyped data
	2, // SSHORT    - 16-bit signed integer
	4, // SLONG     - 32-bit signed integer
	8, // SRATIONAL - 64-bit signed fraction of two 32-bit signed integers
	4, // FLOAT,    - 32-bit IEEE floating point
	8, // DOUBLE    - 64-bit IEEE floating point
	// https://sno.phy.queensu.ca/~phil/exiftool/standards.html
	4 // IFD (sometimes used instead of 4 LONG)
]

function getTypedArray(type) {
	switch (type) {
		case BYTE     : return Uint8Array
		case SHORT    : return Uint16Array
		case LONG     : return Uint32Array
		case RATIONAL : return Array
		case SBYTE    : return Int8Array
		case SSHORT   : return Int16Array
		case SLONG    : return Int32Array
		case SRATIONAL: return Array
		case FLOAT    : return Float32Array
		case DOUBLE   : return Float64Array
		default: return Array
	}
}

// WARNING: In .tif files, exif can be before ifd0
// - namely issue-metadata-extractor-152.tif offsets are: EXIF 2468122, IFD0 2468716, GPS  2468550

// jpg wraps tiff into app1 segment.
export class TiffCore extends AppSegmentParserBase {

	// TODO: future API
	//tagsOutsideChunk = []

	parseHeader() {
		// Detect endian 11th byte of TIFF (1st after header)
		var byteOrder = this.chunk.getUint16()
		if (byteOrder === TIFF_LITTLE_ENDIAN)
			this.le = true // little endian
		else if (byteOrder === TIFF_BIG_ENDIAN)
			this.le = false // big endian
//		else
//			throwError('Invalid EXIF data: expected byte order marker (0x4949 or 0x4D4D).')
		this.chunk.le = this.le
/*
		// Bytes 8 & 9 are expected to be 00 2A.
		if (this.chunk.getUint16(2) !== 0x002A)
			throwError('Invalid EXIF data: expected 0x002A.')
*/
		this.headerParsed = true
	}

	parseTags(offset, blockKey, block = new Map) {
		let {pick, skip} = this.options[blockKey]
		pick = new Set(pick) // clone data from options because we will modify it here
		let onlyPick = pick.size > 0
		let nothingToSkip = skip.size === 0
		let entriesCount = this.chunk.getUint16(offset)
		offset += 2
		for (let i = 0; i < entriesCount; i++) {
			let tag = this.chunk.getUint16(offset)
			if (onlyPick) {
				if (pick.has(tag)) {
					// We have a list only of tags to pick, this tag is one of them, so read it.
					block.set(tag, this.parseTag(offset, tag, blockKey))
					pick.delete(tag)
					if (pick.size === 0) break
				}
			} else if (nothingToSkip || !skip.has(tag)) {
				// We're not limiting what tags to pick. Also this tag is not on a blacklist.
				block.set(tag, this.parseTag(offset, tag, blockKey))
			}
			offset += 12
		}
		return block
	}

	parseTag(offset, tag, blockKey) {
		let {chunk} = this
		let type       = chunk.getUint16(offset + 2)
		let valueCount = chunk.getUint32(offset + 4)
		let valueSize = SIZE_LOOKUP[type]
		let totalSize = valueSize * valueCount
		if (totalSize <= 4)
			offset = offset + 8
		else
			offset = chunk.getUint32(offset + 8)

		if (type < BYTE || type > IFD)
			throwError(`Invalid TIFF value type. block: ${blockKey.toUpperCase()}, tag: ${tag.toString(16)}, type: ${type}, offset ${offset}`)

		if (offset > chunk.byteLength) {
			// TODO: future API
			//this.tagsOutsideChunk.push({tag, offset, type, valueCount, valueSize, totalSize})
			throwError(`Invalid TIFF value offset. block: ${blockKey.toUpperCase()}, tag: ${tag.toString(16)}, type: ${type}, offset ${offset} is outside of chunk size ${chunk.byteLength}`)
		}

		if (type === BYTE) // type 1
			return chunk.getUint8Array(offset, valueCount)

		// ascii strings, array of 8bits/1byte values.
		if (type === ASCII) // type 2
			return normalizeString(chunk.getString(offset, valueCount))

		// undefined/buffers of 8bit/1byte values.
		if (type === UNDEFINED) // type 7
			return chunk.getUint8Array(offset, valueCount)

		// Now that special cases are solved, we can return the normal uint/int value(s).
		if (valueCount === 1) {
			// Return single value.
			return this.parseTagValue(type, offset)
		} else {
			// Return array of values.
			let ArrayType = getTypedArray(type)
			let arr = new ArrayType(valueCount)
			// rational numbers are stored as two integers that we divide when parsing.
			let offsetIncrement = valueSize
			for (let i = 0; i < valueCount; i++) {
				arr[i] = this.parseTagValue(type, offset)
				offset += offsetIncrement
			}
			return arr
		}
	}

	parseTagValue(type, offset) {
		let {chunk} = this
		switch (type) {
			case BYTE     : return chunk.getUint8(offset)
			case SHORT    : return chunk.getUint16(offset)
			case LONG     : return chunk.getUint32(offset)
			case RATIONAL : return chunk.getUint32(offset) / chunk.getUint32(offset + 4)
			case SBYTE    : return chunk.getInt8(offset)
			case SSHORT   : return chunk.getInt16(offset)
			case SLONG    : return chunk.getInt32(offset)
			case SRATIONAL: return chunk.getInt32(offset) / chunk.getInt32(offset + 4)
			case FLOAT    : return chunk.getFloat(offset)
			case DOUBLE   : return chunk.getDouble(offset)
			case 13: return chunk.getUint32(offset)
			default: throwError(`Invalid tiff type ${type}`)
		}
	}

}



const TAG_FILESOURCE = 0xa300
const TAG_SCENETYPE  = 0xa301

/*
JPEG with EXIF segment starts with App1 header (FF E1, length, 'Exif\0\0') and then follows the TIFF.
Whereas .tif file format starts with the TIFF structure right away.

APP1 HEADER (only in JPEG)
- FF E1 - segment marker
- 2Bytes - segment length
- 45 78 69 66 00 00 - string 'Exif\0\0'

APP1 CONTENT
- TIFF HEADER (2b byte order, 2b tiff id, 4b offset of ifd1)
- IFD0
- Exif IFD
- Interop IFD
- GPS IFD
- IFD1
*/
export class TiffExif extends TiffCore {

	static type = 'tiff'
	static headerLength = 10

	// .tif files do no have any APPn segments. and usually start right with TIFF header
	// .jpg files can have multiple APPn segments. They always have APP1 whic is a wrapper for TIFF.
	// We support both jpg and tiff so we're not looking for app1 segment but directly for TIFF
	// because app1 in jpg is only container for tiff.
	static canHandle(view, offset) {
		return view.getUint8(offset + 1) === 0xE1
			&& view.getUint32(offset + 4) === 0x45786966 // 'Exif'
			&& view.getUint16(offset + 8) === 0x0000     // followed by '\0'
	}

	// APP1 includes TIFF formatted values, grouped into IFD blocks (IFD0, Exif, Interop, GPS, IFD1)
	async parse() {
		this.parseHeader()
		let {options} = this
		// WARNING: In .tif files, exif can be before ifd0 (issue-metadata-extractor-152.tif has: EXIF 2468122, IFD0 2468716)
		if (options.ifd0.enabled)    await this.parseIfd0Block()                              // APP1 - IFD0
		if (options.exif.enabled)    await this.safeParse('parseExifBlock')      // APP1 - EXIF IFD
		if (options.gps.enabled)     await this.safeParse('parseGpsBlock')       // APP1 - GPS IFD
		if (options.interop.enabled) await this.safeParse('parseInteropBlock')   // APP1 - Interop IFD
		if (options.ifd1.enabled)    await this.safeParse('parseThumbnailBlock') // APP1 - IFD1
		return this.createOutput()
		//return this.output
	}

	// this is ugly but needed for async-to-promise babel plugin to work
	safeParse(methodName) {
		let result = this[methodName]()
		// Ugly IE fix, async functions always return promises, but not when transpiled.
		if (result.catch !== undefined) result = result.catch(this.handleError)
		return result
	}

	findIfd0Offset() {
		if (this.ifd0Offset === undefined)
			this.ifd0Offset = this.chunk.getUint32(4)
	}

	findIfd1Offset() {
		if (this.ifd1Offset === undefined) {
			this.findIfd0Offset()
			let ifd0Entries = this.chunk.getUint16(this.ifd0Offset)
			let temp = this.ifd0Offset + 2 + (ifd0Entries * 12)
			// IFD1 offset is number of bytes from start of TIFF header where thumbnail info is.
			this.ifd1Offset = this.chunk.getUint32(temp)
		}
	}

	parseBlock(offset, blockKey) {
		let block = new Map
		this[blockKey] = block
		this.parseTags(offset, blockKey, block)
		return block
	}

	async parseIfd0Block() {
		if (this.ifd0) return
		let {file} = this
		// Read the IFD0 segment with basic info about the image
		// (width, height, maker, model and pointers to another segments)
		this.findIfd0Offset()
		if (this.ifd0Offset < 8)
			throwError(MALFORMED)
		if (!file.chunked && this.ifd0Offset > file.byteLength)
			throwError(`IFD0 offset points to outside of file.\nthis.ifd0Offset: ${this.ifd0Offset}, file.byteLength: ${file.byteLength}`)
		//await this.ensureBlockChunk(this.ifd0Offset, estimateMetadataSize(this.options))
		if (file.tiff)
			await file.ensureChunk(this.ifd0Offset, estimateMetadataSize(this.options))
		// Parse IFD0 block.
		let ifd0 = this.parseBlock(this.ifd0Offset, 'ifd0')
		// Cancel if the ifd0 is empty (imaged created from scratch in photoshop).
		if (ifd0.size === 0) return
		// Store offsets of other blocks in the TIFF segment.
		this.exifOffset    = ifd0.get(TAG_IFD_EXIF)
		this.interopOffset = ifd0.get(TAG_IFD_INTEROP)
		this.gpsOffset     = ifd0.get(TAG_IFD_GPS)
		this.xmp           = ifd0.get(TAG_XMP)
		this.iptc          = ifd0.get(TAG_IPTC)
		this.icc           = ifd0.get(TAG_ICC)
		// IFD0 segment also contains offset pointers to another segments deeper within the EXIF.
		if (this.options.sanitize) {
			ifd0.delete(TAG_IFD_EXIF)
			ifd0.delete(TAG_IFD_INTEROP)
			ifd0.delete(TAG_IFD_GPS)
			ifd0.delete(TAG_XMP)
			ifd0.delete(TAG_IPTC)
			ifd0.delete(TAG_ICC)
		}
		return ifd0
	}

	// EXIF block of TIFF of APP1 segment
	// 0x8769
	async parseExifBlock() {
		if (this.exif) return
		if (!this.ifd0) await this.parseIfd0Block()
		if (this.exifOffset === undefined) return
		if (this.file.tiff)
			await this.file.ensureChunk(this.exifOffset, estimateMetadataSize(this.options))
		let exif = this.parseBlock(this.exifOffset, 'exif')
		if (!this.interopOffset) this.interopOffset = exif.get(TAG_IFD_INTEROP)
		this.makerNote   = exif.get(TAG_MAKERNOTE)
		this.userComment = exif.get(TAG_USERCOMMENT)
		if (this.options.sanitize) {
			exif.delete(TAG_IFD_INTEROP)
			exif.delete(TAG_MAKERNOTE)
			exif.delete(TAG_USERCOMMENT)
		}
		this.unpack(exif, TAG_FILESOURCE)
		this.unpack(exif, TAG_SCENETYPE)
		return exif
	}

	unpack(map, key) {
		let value = map.get(key)
		if (value && value.length === 1)
			map.set(key, value[0])
	}

	// GPS block of TIFF of APP1 segment
	// 0x8825
	async parseGpsBlock() {
		if (this.gps) return
		if (!this.ifd0) await this.parseIfd0Block()
		if (this.gpsOffset === undefined) return
		let gps = this.parseBlock(this.gpsOffset, 'gps')
		if (gps && gps.has(TAG_GPS_LAT) && gps.has(TAG_GPS_LON)) {
			// TODO: assign this to this.translated or this.output when blocks are broken down to separate classes
			//gps.latitude  = ConvertDMSToDD(...gps.get(TAG_GPS_LAT), gps.get(TAG_GPS_LATREF))
			//gps.longitude = ConvertDMSToDD(...gps.get(TAG_GPS_LON), gps.get(TAG_GPS_LONREF))
			gps.set('latitude',  ConvertDMSToDD(...gps.get(TAG_GPS_LAT), gps.get(TAG_GPS_LATREF)))
			gps.set('longitude', ConvertDMSToDD(...gps.get(TAG_GPS_LON), gps.get(TAG_GPS_LONREF)))
		}
		return gps
	}

	// INTEROP block of TIFF of APP1 segment
	// 0xA005
	async parseInteropBlock() {
		if (this.interop) return
		if (!this.ifd0) await this.parseIfd0Block()
		if (this.interopOffset === undefined && !this.exif) await this.parseExifBlock()
		if (this.interopOffset === undefined) return
		return this.parseBlock(this.interopOffset, 'interop')
	}

	// THUMBNAIL block of TIFF of APP1 segment
	// parsing this block is skipped when mergeOutput is true because thumbnail block contains with the same tags like ifd0 block
	// and one would override the other. 
	async parseThumbnailBlock(force = false) {
		if (this.ifd1 || this.ifd1Parsed) return
		if (this.options.mergeOutput && !force) return
		this.findIfd1Offset()
		if (this.ifd1Offset > 0) {
			this.parseBlock(this.ifd1Offset, 'ifd1')
			this.ifd1Parsed = true
		}
		return this.ifd1
	}

	// THUMBNAIL buffer of TIFF of APP1 segment
	async extractThumbnail() {
		if (!this.headerParsed) this.parseHeader()
		if (!this.ifd1Parsed) await this.parseThumbnailBlock(true)
		if (this.ifd1 === undefined) return 
		// TODO: replace 'ThumbnailOffset' & 'ThumbnailLength' by raw keys (when tag dict is not included)
		let offset = this.ifd1.get(THUMB_OFFSET)
		let length = this.ifd1.get(THUMB_LENGTH)
		return this.chunk.getUint8Array(offset, length)
	}

	get image()     {return this.ifd0}
	get thumbnail() {return this.ifd1}

	createOutput() {
		let tiff = {}
		let block, blockKey, blockOutput
		for (blockKey of tiffBlocks) {
			block = this[blockKey]
			if (isEmpty(block)) continue
			if (this.canTranslate)
				blockOutput = this.translateBlock(block, blockKey)
			else
				blockOutput = Object.fromEntries(block)
			if (this.options.mergeOutput) {
				// NOTE: Not assigning thumbnail because it contains the same tags as ifd0.
				if (blockKey === 'ifd1') continue
				Object.assign(tiff, blockOutput)
			} else {
				tiff[blockKey] = blockOutput
			}
		}
		if (this.makerNote)   tiff.makerNote   = this.makerNote
		if (this.userComment) tiff.userComment = this.userComment
		return tiff
	}

	assignToOutput(root, tiff) {
		if (this.globalOptions.mergeOutput) {
			// xmp contains only properties
			Object.assign(root, tiff)
		} else {
			for (let [blockKey, block] of Object.entries(tiff))
				this.assignObjectToOutput(root, blockKey, block)
		}
	}

}

function ConvertDMSToDD(degrees, minutes, seconds, direction) {
	var dd = degrees + (minutes / 60) + (seconds / (60*60))
	if (direction === 'S' || direction === 'W') dd *= -1
	return dd
}

segmentParsers.set('tiff', TiffExif)