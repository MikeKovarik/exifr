import * as tags from './tags'
import {
	getUint8,
	getUint16,
	getUint32,
	getInt8,
	getInt16,
	getInt32,
	slice,
	toString
} from './buff-util.mjs'


const SIZE_LOOKUP = [
	1, 1, 2, 4, 8,
	1, 1, 2, 4, 8
]

// First argument can be either Buffer or DataView instance.
export function parse(...args) {
	return (new ExifParser(...args)).getResult()
}



// First argument can be Node's Buffer or Web's DataView instance.
// Takes chunk of file and tries to find EXIF (it usually starts inside the chunk, but is much larger).
// Returns location {start, size, end} of the EXIF in the file not the input chunk itself.

function findAppSegment(buffer, n, condition, callback) {
	var length = (buffer.length || buffer.byteLength) - 10
	var nMarkerByte = 0xE0 | n
	for (var offset = 0; offset < length; offset++) {
		if (getUint8(buffer, offset) === 0xFF
		 && getUint8(buffer, offset + 1) === nMarkerByte
		 && condition(buffer, offset)) {
		 	if (callback)
				return callback(buffer, offset)
			var start = offset
			var size = getUint16(buffer, offset + 2)
			var end = start + size
			return {start, size, end}
		}
	}
}



export function findTiff(buffer) {
	return findAppSegment(buffer, 1, isExifSegment, getExifSize)
}

function isExifSegment(buffer, offset) {
	return getUint32(buffer, offset + 4) === 0x45786966 // 'Exif'
		&& getUint16(buffer, offset + 8) === 0x0000     // followed by '\0'
}

function getExifSize(buffer, offset) {
	var start = offset + 10
	var size = getUint16(buffer, offset + 2)
	var end = start + size
	return {start, size, end}
}



function findXmp(buffer) {
	return findAppSegment(buffer, 1, isXmpSegment, getXmpSize)
}

function isXmpSegment(buffer, offset) {
	return getUint32(buffer, offset + 4) === 0x68747470 // 'http'
}

function getXmpSize(buffer, offset) {
	var start = offset + 4
	var size = getUint16(buffer, offset + 2)
	var end = start + size
	return {start, size, end}
}



// NOTE: This only works with single segment ICC data.
// TODO: Implement multi-segment parsing.
// Not implemented for now
function findIcc(buffer) {
	//return findAppSegment(buffer, 2, isIccSegment, getIccSize)
}

function isIccSegment(buffer, offset) {
	// TODO
}

function getIccSize(buffer, offset) {
	// TODO
}



// NOTE: This only works with single segment IPTC data.
// TODO: Implement multi-segment parsing.
//function findIptc(buffer, offset = 0) {
//	return findAppSegment(buffer, 13, isIptcSegment, getIptcSize)
//}

// NOTE: reverted back to searching by the 38 42 49... bytes, because ID string could change (Photoshop 2.5, Photoshop 3)
function findIptc(buffer, offset) {
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

function isIptcSegmentHead(buffer, offset) {
	return getUint8(buffer, offset)     === 0x38
		&& getUint8(buffer, offset + 1) === 0x42
		&& getUint8(buffer, offset + 2) === 0x49
		&& getUint8(buffer, offset + 3) === 0x4D
		&& getUint8(buffer, offset + 4) === 0x04
		&& getUint8(buffer, offset + 5) === 0x04
}




// https://sno.phy.queensu.ca/~phil/exiftool/TagNames/JPEG.html
// http://dev.exiv2.org/projects/exiv2/wiki/The_Metadata_in_JPEG_files
// JPG contains SOI, APP1, [APP2, ... APPn], DQT, DHT, and more segments
// APPn contain metadata about the image in various formats. There can be multiple APPn segments,
// even multiple segments of the same type.
// APP1 contains the basic and most important EXIF data.
// APP2 contains ICC, APP13 contains IPTC, and the main APP1 (the one with EXIF) is often followed
// by another APP1 with XMP data (in XML format).
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
export class ExifParser {

	constructor(buffer, options = {}, tiffPosition) {
		this.buffer = buffer
		this.options = options
		this.baseOffset = 0

		if (tiffPosition)
			this.tiffOffset = tiffPosition.start

		// The basic EXIF tags (image, exif, gps)
		if (this.options.tiff)	this.parseTiff()
		// Additional XML data
		if (this.options.xmp)	this.parseXmp()
		// Image profile
		if (this.options.icc)	this.parseIcc()
		// Captions and copyrights
		if (this.options.iptc)	this.parseIptc()
	}

	getResult() {
		if (this.options.mergeOutput) {
			// NOTE: skipping thumbnail and xmp
			var exif = Object.assign({}, this.image, this.exif, this.gps, this.interop, this.iptc)
		} else {
			var exif = {}
			if (this.image)     exif.image     = this.image
			if (this.thumbnail) exif.thumbnail = this.thumbnail
			if (this.exif)      exif.exif      = this.exif
			if (this.gps)       exif.gps       = this.gps
			if (this.interop)   exif.interop   = this.interop
			if (this.iptc)      exif.iptc      = this.iptc
		}
		if (this.xmp)       exif.xmp       = this.xmp
		// Return undefined rather than empty object if there's no data.
		if (Object.keys(exif).length === 0) return
		return exif
	}


	// NOTE: TIFF (APP1-EXIF) Segment starts with 10 byte header which looks this way:
	// FF E1 - segment marker
	// xx xx - 2Bytes = 16b number determining the size of the segment
	// 45 78 69 66 00 00 - string 'Exif\0\0'
	// This expects this.tiffOffset to be defined and poiting at the first byte after the header
	// (in other words - 11th byte of the segment) and skips checks that should be done in other
	// methods like .findTiff()
	parseTiff() {
		// Cancel if the file doesn't contain the segment or if it's damaged.
		if (!this.ensureSegmentPosition('tiff', findTiff, false)) return

		// Detect endian 11th byte of TIFF (1st after header)
		var marker = getUint16(this.buffer, this.tiffOffset)
		if (marker === 0x4949)
			this.le = true // little endian
		else if (marker === 0x4D4D)
			this.le = false // big endian
		else
			throw new Error('Invalid EXIF data: expected byte order marker (0x4949 or 0x4D4D).')

		// Bytes 8 & 9 are expected to be 00 2A.
		if (getUint16(this.buffer, this.tiffOffset + 2, this.le) !== 0x002A)
			throw new Error('Invalid EXIF data: expected 0x002A.')

		var ifd0Offset = getUint32(this.buffer, this.tiffOffset + 4, this.le)

		// Read the IFD0 segment with basic info about the image
		// (width, height, maker, model and pointers to another segments)
		if (ifd0Offset < 8)
			throw new Error('Invalid EXIF data: IFD0 offset should be less than 8')
		var ifd0 = this.parseTiffTags(this.tiffOffset + ifd0Offset, tags.exif)

		// Cancel if the ifd0 is empty (imaged created from scratch in photoshop).
		if (Object.keys(ifd0).length === 0) return

		// IFD0 segment contains also offset pointers to another segments deeper within the EXIF.
		// User doesn't need to see this. But we're sanitizing it only if options.postProcess is enabled.
		if (this.options.postProcess) {
			this.image = Object.assign({}, ifd0)
			delete this.image.ExifIFDPointer
			delete this.image.GPSInfoIFDPointer
			delete this.image.InteroperabilityIFDPointer
		} else {
			this.image = ifd0
		}

		if (this.options.exif && ifd0.ExifIFDPointer)
			this.exif = this.parseTiffTags(this.tiffOffset + ifd0.ExifIFDPointer, tags.exif)

		if (this.options.gps && ifd0.GPSInfoIFDPointer) {
			let gps = this.gps = this.parseTiffTags(this.tiffOffset + ifd0.GPSInfoIFDPointer, tags.gps)
			// Add custom timestamp property as a mixture of GPSDateStamp and GPSTimeStamp
			if (this.options.postProcess) {
				if (gps.GPSDateStamp && gps.GPSTimeStamp)
					gps.timestamp = reviveDate(gps.GPSDateStamp + ' ' + gps.GPSTimeStamp)
				if (gps && gps.GPSLatitude) {
					gps.latitude   = ConvertDMSToDD(...gps.GPSLatitude, gps.GPSLatitudeRef)
					gps.longitude = ConvertDMSToDD(...gps.GPSLongitude, gps.GPSLongitudeRef)
				}
			}
		}
	
		if (this.options.interop) {
			var interopIfdOffset = ifd0.InteroperabilityIFDPointer || (this.exif && this.exif.InteroperabilityIFDPointer)
			if (interopIfdOffset)
				this.interop = this.parseTiffTags(this.tiffOffset + interopIfdOffset, tags.exif)
		}

		if (this.options.thumbnail && !this.options.mergeOutput) {
			var ifd0Entries = getUint16(this.buffer, this.tiffOffset + ifd0Offset, this.le)
			var thumbnailIfdOffsetPointer = this.tiffOffset + ifd0Offset + 2 + (ifd0Entries * 12)
			var thumbnailIfdOffset = getUint32(this.buffer, thumbnailIfdOffsetPointer, this.le)
			if (thumbnailIfdOffset)
				this.thumbnail = this.parseTiffTags(this.tiffOffset + thumbnailIfdOffset, tags.exif)
		}

	}

	parseTiffTags(offset, tagNames) {
		var entriesCount = getUint16(this.buffer, offset, this.le)
		offset += 2
		var res = {}
		for (var i = 0; i < entriesCount; i++) {
			var tempOffset = offset
			var tag = getUint16(this.buffer, offset, this.le)
			var key = tagNames[tag] || tag
			var val = this.parseTiffTag(offset)
			if (this.options.postProcess)
				val = this.translateValue(key, val)
			res[key] = val
			offset += 12
		}
		return res
	}

	parseTiffTag(offset) {
		var type = getUint16(this.buffer, offset + 2, this.le)
		var valuesCount = getUint32(this.buffer, offset + 4, this.le)
		var valueByteSize = SIZE_LOOKUP[type - 1]
		if (valueByteSize * valuesCount <= 4)
			var valueOffset = offset + 8
		else
			var valueOffset = this.tiffOffset + getUint32(this.buffer, offset + 8, this.le)

		// ascii strings, array of 8bits/1byte values.
		if (type === 2) {
			var end = valueOffset + valuesCount
			var string = toString(this.buffer, valueOffset, end)
			if (string.endsWith('\0')) // remove null terminator
				return string.slice(0, -1)
			return string
		}

		// undefined/buffers of 8bit/1byte values.
		if (type === 7)
			return slice(this.buffer, valueOffset, valueOffset + valuesCount)

		// Now that special cases are solved, we can return the normal uint/int value(s).
		if (valuesCount === 1) {
			// Return single value.
			return this.parseTiffTagValue(valueOffset, type)
		} else {
			// Return array of values.
			var res = []
			for (var i = 0; i < valuesCount; i++) {
				res.push(this.parseTiffTagValue(valueOffset, type))
				valueOffset += valueByteSize
			}
			return res
		}
	}

	parseTiffTagValue(offset, type) {
		switch (type) {
			case 1:  return getUint8(this.buffer, offset)
			case 3:  return getUint16(this.buffer, offset, this.le)
			case 4:  return getUint32(this.buffer, offset, this.le)
			case 5:  return getUint32(this.buffer, offset, this.le) / getUint32(this.buffer, offset + 4, this.le)
			case 6:  return getInt8(this.buffer, offset)
			case 8:  return getInt16(this.buffer, offset, this.le)
			case 9:  return getInt32(this.buffer, offset, this.le)
			case 10: return getInt32(this.buffer, offset, this.le) / getInt32(this.buffer, offset + 4, this.le)
		}
	}

	// Converts date string to Date instances, replaces enums with string descriptions
	// and fixes values that are incorrectly treated as buffers.
	translateValue(key, val) {
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


	parseXmp() {
		// Cancel if the file doesn't contain the segment or if it's damaged.
		if (!this.ensureSegmentPosition('xmp', findXmp)) return

		// Read XMP segment as string. We're not parsing the XML.
		this.xmp = toString(this.buffer, this.xmpOffset, this.xmpOffset + this.xmpEnd)

		// Trims the mess around.
		if (this.options.postProcess) {
			let start = this.xmp.indexOf('<x:xmpmeta')
			let end = this.xmp.indexOf('x:xmpmeta>') + 10
			this.xmp = this.xmp.slice(start, end)
		}
	}


	// Not currently implemented.
	parseIcc() {
		// TODO
	}


	// NOTE: This only works with single segment IPTC data.
	// TODO: Implement multi-segment parsing.
	parseIptc() {
		// Cancel if the file doesn't contain the segment or if it's damaged.
		if (!this.ensureSegmentPosition('iptc', findIptc)) return

		// Parse each value in the buffer into key:value pair.
		this.iptc = {}
		var offset = this.iptcOffset
		for (var offset = 0; offset < this.iptcEnd; offset++) {
			if (getUint8(this.buffer, offset) === 0x1C && getUint8(this.buffer, offset + 1) === 0x02) {
				let size = getInt16(this.buffer, offset + 3)
				let tag = getUint8(this.buffer, offset + 2)
				let key = tags.iptc[tag] || tag
				let val = toString(this.buffer, offset + 5, offset + 5 + size)
				this.iptc[key] = setValueOrArrayOfValues(val, this.iptc[key])
			}
		}
	}

	ensureSegmentPosition(name, finder, requireEnd = true) {
		var OFFSET = name + 'Offset'
		var END = name + 'End'
		if (this[OFFSET] === undefined || (requireEnd && this[END] === undefined)) {
			let position = finder(this.buffer, this.baseOffset)
			if (position === undefined) return false
			this[OFFSET] = position.start
			this[END]    = position.end
		}
		// Cancel if the file doesn't contain the segment or if it's damaged.
		if (this[OFFSET] === undefined || (requireEnd && this[END] === undefined)) return false
		// Otherwise we're good to go
		return true
	}

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

function setValueOrArrayOfValues(newValue, existingValue) {
	if (existingValue !== undefined) {
		if (existingValue instanceof Array) {
			existingValue.push(val)
			return existingValue
		} else {
			return [existingValue, newValue]
		}
	} else {
		return newValue
	}
}

function ConvertDMSToDD(degrees, minutes, seconds, direction) {
	var dd = degrees + (minutes / 60) + (seconds / (60*60))
	// Don't do anything for N or E
	if (direction == 'S' || direction == 'W')
		dd *= -1
	return dd
}