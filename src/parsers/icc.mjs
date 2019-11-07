import {AppSegment, parsers} from './core.mjs'
import {BufferView} from '../util/BufferView.mjs'
import {tagKeys, tagValues} from '../tags.mjs'


const PROFILE_HEADER_LENGTH = 84

const TAG_TYPE_DESC = 'desc'
const TAG_TYPE_MLUC = 'mluc'
const TAG_TYPE_TEXT = 'text'
const TAG_TYPE_SIG  = 'sig '

const VALU_EMPTY = '\x00\x00\x00\x00'

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
		this.output = {}
		this.parseHeader()
		this.parseTags()
		if (this.options.translateValues) this.translateValues()
		if (this.options.translateTags) this.translateTags()
		return this.output
	}

	parseHeader() {
		if (this.view.byteLength < PROFILE_HEADER_LENGTH)
			throw new Error('ICC header is too short')
		for (let [offset, psrser] of Object.entries(headerParsers)) {
			offset = parseInt(offset, 10)
			let val = psrser(this.view, offset)
			if (val === VALU_EMPTY) continue
			this.output[offset] = val
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

	// TODO
	translateTags() {
		let iccKeys = tagKeys.icc
		let entries = Object.entries(this.output).map(([key, val]) => [iccKeys[key] || key, val])
		console.log(entries)
		this.output = Object.fromEntries(entries)
		/*
		let iccVals = tagValues.icc
		if (translateTags) key = iccKeys[key] || key
		if (translateValues) {
			let valDic = iccVals[offset]
			if (valDic) val = valDic[val] || val
		}
		*/
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