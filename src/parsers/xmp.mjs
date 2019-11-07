import {AppSegment, parsers} from './core.mjs'
import {BufferView} from '../util/BufferView.mjs'


//<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="XMP Core 5.6.0"></x>
// XMPToolkit
export default class Xmp extends AppSegment {

	static type = 'xmp'

	static canHandle(buffer, offset) {
		return buffer.getUint8(offset + 1) === 0xE1
			&& buffer.getUint32(offset + 4) === 0x68747470 // 'http'
	}
/*
	// TODO: check & calculate the values are correct
	static parsePosition(buffer, offset) {
		var length = buffer.getUint16(offset + 2)
		var start = offset + 4
		var size = buffer.getUint16(offset + 2) - 2
		var end = start + size
		return {offset, start, size, end}
	}
*/
	parse() {
		// Read XMP segment as string. We're not parsing the XML.
		let string = this.view.getString()
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
		return string
	}

	//parseXml() {}

}

parsers.xmp = Xmp