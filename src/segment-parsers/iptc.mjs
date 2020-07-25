import {AppSegmentParserBase} from '../parser.mjs'
import {segmentParsers} from '../plugins.mjs'


/*
http://fileformats.archiveteam.org/wiki/Photoshop_Image_Resources
In a TIFF file, tag 34377 contains Photoshop Image Resources.
In a JPEG file, an APP13 marker with an identifier of "Photoshop 3.0" contains Photoshop Image Resources.
Resource ID 0x0404 contains IPTC data.
Resource ID 0x040c may contain a thumbnail in JPEG/JFIF format.
Resource ID 0x040F contains an ICC profile.
Resource ID 0x0422 contains Exif data.
Resource ID 0x0424 contains XMP data.
*/

export default class Iptc extends AppSegmentParserBase {

	static type = 'iptc'

	static translateValues = false
	static reviveValues = false

	static canHandle(file, offset) {
		return file.getUint8(offset + 1) === 0xED
			&& file.getString(offset + 4, 9) === 'Photoshop'
	}

	static headerLength(file, offset, length) {
		for (let i = 0; i < length; i++) {
			if (this.isIptcSegmentHead(file, offset + i)) {
				// Get the length of the name header (which is padded to an even number of bytes)
				var nameHeaderLength = file.getUint8(offset + i + 7)
				if (nameHeaderLength % 2 !== 0) nameHeaderLength += 1
				// Check for pre photoshop 6 format
				if (nameHeaderLength === 0) nameHeaderLength = 4
				return i + 8 + nameHeaderLength
			}
		}
	}

	static isIptcSegmentHead(chunk, offset) {
		return chunk.getUint8(offset)     === 0x38 // I - photoshop segment start
			&& chunk.getUint8(offset + 1) === 0x42 // B - photoshop segment start
			&& chunk.getUint8(offset + 2) === 0x49 // I - photoshop segment start
			&& chunk.getUint8(offset + 3) === 0x4D // M - photoshop segment start
			&& chunk.getUint8(offset + 4) === 0x04 // IPTC segment head
			&& chunk.getUint8(offset + 5) === 0x04 // IPTC segment head
			// NOTE: theres much more in the Photoshop format than just IPTC
	}

	parse() {
		let {raw} = this
		let iterableLength = this.chunk.byteLength - 1
		for (let offset = 0; offset < iterableLength; offset++) {
			// reading Uint8 and then another to prevent unnecessarry read of two subsequent bytes, when iterating
			if (this.chunk.getUint8(offset) === 0x1C && this.chunk.getUint8(offset + 1) === 0x02) {
				let size = this.chunk.getUint16(offset + 3)
				let key = this.chunk.getUint8(offset + 2)
				let val = this.chunk.getString(offset + 5, size)
				raw.set(key, this.pluralizeValue(raw.get(key), val))
				// skip iterating over the bytes we've already read
				offset += 4 + size
			}
		}
		this.translate()
		return this.output
	}

	pluralizeValue(existingVal, newVal) {
		if (existingVal !== undefined) {
			if (existingVal instanceof Array) {
				existingVal.push(newVal)
				return existingVal
			} else {
				return [existingVal, newVal]
			}
		} else {
			return newVal
		}
	}

}

segmentParsers.set('iptc', Iptc)