import {AppSegment, parsers} from './core.js'
import {BufferView} from '../util/BufferView.js'


// TODO: modify AppSegment to accept not only buffers,
//       XMP is usually string and we're converting it to buffer to be passed to AppSegment
//       and this Xmp parser then converts it back to string.

//<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="XMP Core 5.6.0"></x>
// XMPToolkit
export default class Xmp extends AppSegment {

	static type = 'xmp'

	static canHandle(buffer, offset) {
		return buffer.getUint8(offset + 1) === 0xE1
			&& buffer.getUint32(offset + 4) === 0x68747470 // 'http'
	}
	parse() {
		// Read XMP segment as string. We're not parsing the XML.
		let string = this.chunk.getString()
		// Trim the mess around.
		let start = string.indexOf('<?xpacket')
		let end = string.lastIndexOf('?>')
		string = string.slice(start, end)
		// Parse XML if the user provided his own XMP parser.
		if (this.parseXml)
			return this.parseXml(string)
		else
			return string
	}

	//parseXml() {}

}

parsers.xmp = Xmp