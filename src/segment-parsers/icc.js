import {AppSegmentParserBase, segmentParsers} from '../parser.js'


const PROFILE_HEADER_LENGTH = 84

const TAG_TYPE_DESC = 'desc'
const TAG_TYPE_MLUC = 'mluc'
const TAG_TYPE_TEXT = 'text'
const TAG_TYPE_SIG  = 'sig '
// TODO: other types 'mft2', 'XYZ '

const EMPTY_VALUE = '\x00\x00\x00\x00'

export default class IccParser extends AppSegmentParserBase {

	static type = 'icc'
	static headerLength = 18

	static canHandle(chunk, offset) {
		return chunk.getUint8(offset + 1) === 0xE2
			&& chunk.getUint32(offset + 4) === 0x4943435f // ICC_
			// ICC_PROFILE
	}

	static findPosition(chunk, offset) {
		let seg = super.findPosition(chunk, offset)
		seg.chunkNumber  = chunk.getUint8(offset + 16)
		seg.chunkCount   = chunk.getUint8(offset + 17)
		seg.multiSegment = seg.chunkCount > 1
		if (seg.chunkCount > 1) {
			// TODO: API for signalling to main parser that it should keep going through file
			// and not stop untill all chunks are found
			console.warn('multi-segment ICC is not yet supported')
		}
		return seg
	}

	parse() {
		this.output = {}
		this.parseHeader()
		this.parseTags()
		this.translate()
		return this.output
	}

	parseHeader() {
		let icc = this.output
		if (this.chunk.byteLength < PROFILE_HEADER_LENGTH)
			throw new Error('ICC header is too short')
		for (let [offset, parse] of Object.entries(headerParsers)) {
			offset = parseInt(offset, 10)
			let val = parse(this.chunk, offset)
			if (val === EMPTY_VALUE) continue
			icc[offset] = val
		}
	}

	parseTags() {
		let icc = this.output
		let tagCount = this.chunk.getUint32(128)
		let offset = 132
		while (tagCount--) {
			let code = this.chunk.getString(offset, 4)
			let value = this.parseTag(offset)
			// Not all the type parsers are implemented.
			if (value !== undefined && value !== EMPTY_VALUE) icc[code] = value
			offset += 12
		}
	}

	parseTag(cursor) {
		let offset = this.chunk.getUint32(cursor + 4)
		let size   = this.chunk.getUint32(cursor + 8)
		let type   = this.chunk.getString(offset, 4)
		switch (type) {
			case TAG_TYPE_DESC: return this.parseDesc(offset)
			case TAG_TYPE_MLUC: return this.parseMluc(offset)
			case TAG_TYPE_TEXT: return this.parseText(offset, size)
			case TAG_TYPE_SIG:  return this.parseSig(offset)
			// TODO: implement more types
		}
		//return this.file.getUint8Array(offset, size)
	}

	parseDesc(offset) {
		let size  = this.chunk.getUint32(offset + 8) - 1 // last byte is null termination
		return this.chunk.getString(offset + 12, size).trim()
	}

	parseText(offset, size) {
		return this.chunk.getString(offset + 8, size - 15).trim()
	}

	// NOTE: some tags end with empty space. TODO: investigate. maybe add .trim() 
	parseSig(offset) {
		return this.chunk.getString(offset + 8, 4).trim()
	}

	// Multi Localized Unicode Type
	parseMluc(tagOffset) {
		let {chunk} = this
		let entryCount  = chunk.getUint32(tagOffset + 8)
		let entrySize   = chunk.getUint32(tagOffset + 12)
		let entryOffset = tagOffset + 16
		let values      = []
		for (let i = 0; i < entryCount; i++) {
			let lang    = chunk.getString(entryOffset + 0, 2)
			let country = chunk.getString(entryOffset + 2, 2)
			let length  = chunk.getUint32(entryOffset + 4)
			let offset  = chunk.getUint32(entryOffset + 8) + tagOffset
			let text = chunk.getUnicodeString(offset, length)
			values.push({lang, country, text})
			entryOffset += entrySize
		}
		if (entryCount === 1)
			return values[0].text
		else
			return values
	}

	translateValue(val, dict) {
		if (dict) {
			if (typeof val === 'string')
				return dict[val] || dict[val.toLowerCase()] || val
			else
				return dict[val] || val
		}
	}

}

const headerParsers = {
	4: parseString,
	8: parseVersion,
	12: parseString,
	16: parseString,
	20: parseString,
	24: parseDate,
	36: parseString,
	40: parseString,
	48: parseString,
	52: parseString,
	64: (view, offset) => view.getUint32(offset),
	80: parseString
}

function parseString(view, offset) {
	return view.getString(offset, 4).trim()
}

function parseVersion(view, offset) {
	return [
		view.getUint8(offset),
		view.getUint8(offset + 1) >> 4,
		view.getUint8(offset + 1) % 16,
	]
	.map(num => num.toString(10))
	.join('.')
}

function parseDate(view, offset) {
	const year    = view.getUint16(offset)
	const month   = view.getUint16(offset + 2) - 1
	const day     = view.getUint16(offset + 4)
	const hours   = view.getUint16(offset + 6)
	const minutes = view.getUint16(offset + 8)
	const seconds = view.getUint16(offset + 10)
	return new Date(Date.UTC(year, month, day, hours, minutes, seconds))
}


segmentParsers.set('icc', IccParser)