import {AppSegment, parsers} from './core.mjs'
import {BufferView} from '../util/BufferView.mjs'
import {tagKeys, tagValues} from '../tags.mjs'


const PROFILE_HEADER_LENGTH = 84

const TAG_TYPE_DESC = 'desc'
const TAG_TYPE_MLUC = 'mluc'
const TAG_TYPE_TEXT = 'text'
const TAG_TYPE_SIG  = 'sig '

const VALU_EMPTY = '\x00\x00\x00\x00'

var canTranslate = true // TODO: pass this through options

export default class IccParser extends AppSegment {

	static type = 'icc'
	static headerLength = 18

	static canHandle(buffer, offset) {
		return buffer.getUint8(offset + 1) === 0xE2
		/*
			&& buffer.getUint32(offset + 4) === 0x4A464946 // 'JFIF'
			&& buffer.getUint8(offset + 8) === 0x00       // followed by '\0'
		*/
	}

	parse() {
		//this.view = BufferView.from(arg)
		//this.view = new BufferView(this.buffer, this.start, this.size)
		console.log(this.view.toString())
		console.log(this.view.toString())

		this.output = {}
		this.parseHeader()
		this.parseTags()
		this.translateValues()
		this.translateTags()
		return this.output
	}

	parseHeader() {
		if (this.view.byteLength < PROFILE_HEADER_LENGTH)
			throw new Error('ICC header is too short')
		for (const [offset, entry] of Object.entries(iccProfile)) {
			/*
			let value
			if (headerParsers[offset])
				value = headerParsers[offset](this.view, offset)
			else
				value = this.view.getString(offset, 4)
			console.log(offset, parser.toString())
			*/
			let value = entry.value(this.view, parseInt(offset, 10))
			if (canTranslate && entry.description) value = entry.description(value) || value
			this.output[entry.name] = value
		}
	}

	parseTags() {
		let tagCount = this.view.getUint32(128)
		let offset = 132
		while (tagCount--) {
			let code = this.view.getString(offset, 4)
			let value = this.parseTag(offset)
			// Not all the type parsers are implemented.
			if (value !== undefined && value !== VALU_EMPTY) this.output[code] = value
			offset += 12
		}
	}

	parseTag(cursor) {
		let offset = this.view.getUint32(cursor + 4)
		let size   = this.view.getUint32(cursor + 8)
		let type   = this.view.getString(offset, 4)
		switch (type) {
			case TAG_TYPE_DESC: return this.parseDesc(offset)
			case TAG_TYPE_MLUC: return this.parseMluc(offset)
			case TAG_TYPE_TEXT: return this.parseText(offset, size)
			case TAG_TYPE_SIG:  return this.parseSig(offset)
			// TODO: implement more types
		}

	}

	parseDesc(offset) {
		let size  = this.view.getUint32(offset + 8) - 1 // last byte is null termination
		return this.view.getString(offset + 12, size).trim()
	}

	parseText(offset, size) {
		return this.view.getString(offset + 8, size - 15).trim()
	}

	// NOTE: some tags end with empty space. TODO: investigate. maybe add .trim() 
	parseSig(offset) {
		return this.view.getString(offset + 8, 4).trim()
	}

	// Multi Localized Unicode Type
	parseMluc(tagOffset) {
		let {view} = this
		let entryCount = view.getUint32(tagOffset + 8)
		let entrySize  = view.getUint32(tagOffset + 12)
		let entryOffset = tagOffset + 16
		let values = []
		for (let i = 0; i < entryCount; i++) {
			let lang    = view.getString(entryOffset + 0, 2)
			let country = view.getString(entryOffset + 2, 2)
			let length  = view.getUint32(entryOffset + 4)
			let offset  = view.getUint32(entryOffset + 8) + tagOffset
			let text = view.getUnicodeString(offset, length)
			values.push({lang, country, text})
			entryOffset += entrySize
		}
		if (entryCount === 1)
			return values[0].text
		else
			return values
	}

	translateTags() {
		let entries = Object.entries(this.output).map(([tag, value]) => [tagKeys.icc[tag] || tag, value])
		this.output = Object.fromEntries(entries)
	}

	translateValues() {
		// TODO
		// MSFT => Microsoft
	}

}






export const headerParsers = {
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

export const iccProfile = {
	4: {
		'name': tagKeys.icc[4],
		'value': headerParsers[4],
		'description': (value) => tagValues.icc[4][value],
	},
	8: {
		'name': tagKeys.icc[8],
		'value': headerParsers[8],
	},
	12: {
		'name': tagKeys.icc[12],
		'value': headerParsers[12],
		'description': (value) => tagValues.icc[12][value],
	},
	16: {
		'name': tagKeys.icc[16],
		'value': headerParsers[16],
	},
	20: {
		'name': tagKeys.icc[20],
		'value': headerParsers[20],
	},
	24: {
		'name': tagKeys.icc[24],
		'value': headerParsers[24],
	},
	36: {
		'name': tagKeys.icc[36],
		'value': headerParsers[36],
	},
	40: {
		'name': tagKeys.icc[40],
		'value': headerParsers[40],
		'description': (value) => tagValues.icc[40][value],
	},
	48: {
		'name': tagKeys.icc[48],
		'value': headerParsers[48],
		'description': (value) => tagValues.icc[48][value],
	},
	52: {
		'name': tagKeys.icc[52],
		'value': headerParsers[52],
	},
	64: {
		'name': tagKeys.icc[64],
		'value': headerParsers[64],
		'description': (value) => tagValues.icc[64][value],
	},
	80: {
		'name': tagKeys.icc[80],
		'value': headerParsers[80]
	},
}

function parseString(view, offset) {
	return view.getString(offset, 4).trim()
}

function parseVersion(view, offset) {
	return (view.getUint8(offset)).toString(10)
		+ '.' + (view.getUint8(offset + 1) >> 4).toString(10)
		+ '.' + (view.getUint8(offset + 1) % 16).toString(10)
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


parsers.icc = IccParser