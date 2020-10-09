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

const HEADER_8    = 0x38
const HEADER_8BIM = 0x3842494D
const HEADER_IPTC = 0x0404
const MARKER = 0xED
const PHOTOSHOP = 'Photoshop'

export default class Iptc extends AppSegmentParserBase {

	static type = 'iptc'

	static translateValues = false
	static reviveValues = false

	// APP13 very complicated and doesn't just simply contain IPTC data.
	// It is in fact Photoshop format, which contains it's own chunks, each starting with 8BIM header.
	// IPTC is just one of those chunks and may start several hundreds of bytes into the segment.
	// IPTC chunk in the format starts with 8BIM followed by 4 4 (0x0404)
	// TLDR: We can't just compare bytes. The chunk has to be traversed.

	static canHandle(file, offset, length) {
		let isApp13 = file.getUint8(offset + 1) === MARKER
				   && file.getString(offset + 4, 9) === PHOTOSHOP
		if (!isApp13) return false
		let i = this.containsIptc8bim(file, offset, length)
		return i !== undefined
	}

	// WARNING: There can be files with APP13 segment, containing various Photoshop related
	// data, but no IPTC. We musn't falsely accept these segments as IPTC!
	static headerLength(chunk, offset, length) {
		let nameHeaderLength
		let i = this.containsIptc8bim(chunk, offset, length)
		if (i !== undefined) {
			// Get the length of the name header (which is padded to an even number of bytes)
			nameHeaderLength = chunk.getUint8(offset + i + 7)
			if (nameHeaderLength % 2 !== 0) nameHeaderLength += 1
			// Check for pre photoshop 6 format
			if (nameHeaderLength === 0) nameHeaderLength = 4
			return i + 8 + nameHeaderLength
		}
	}

	static containsIptc8bim(chunk, offset, length) {
		for (let i = 0; i < length; i++)
			if (this.isIptcSegmentHead(chunk, offset + i))
				return i
	}

	static isIptcSegmentHead(chunk, offset) {
		// isIptcSegmentHead is called on each byte while traversing the file.
		// This could be hundreds of times. We don't want to read the same overlaping range
		// over and over, so just read the first byte and only then continue.
		return chunk.getUint8(offset)      === HEADER_8    // 8 - photoshop segment start
			&& chunk.getUint32(offset)     === HEADER_8BIM // 8BIM - photoshop segment start
			&& chunk.getUint16(offset + 4) === HEADER_IPTC // IPTC segment head
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