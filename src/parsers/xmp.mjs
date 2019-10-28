import {AppSegment, parsers} from './core.mjs'
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
} from '../buff-util.mjs'


//<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="XMP Core 5.6.0"></x>
// XMPToolkit
export default class Xmp extends AppSegment {

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

parsers.xmp = Xmp