import {AppSegmentParserBase} from '../parser.mjs'
import {segmentParsers} from '../plugins.mjs'


export default class Ihdr extends AppSegmentParserBase {

	static type = 'ihdr'

	parse() {
		this.parseTags()
		this.translate()
		return this.output
	}

	parseTags() {
		this.raw = new Map([
			[0,  this.chunk.getUint32(0)],
			[4,  this.chunk.getUint32(4)],
			[8,  this.chunk.getUint8(8)],
			[9,  this.chunk.getUint8(9)],
			[10, this.chunk.getUint8(10)],
			[11, this.chunk.getUint8(11)],
			[12, this.chunk.getUint8(12)],
			// PNG contains additional string data in free tEXt chunks.
			// These kinda belong to IHDR, but are not part of the IHDR chunk
			// and would require additional segment-parser class. Instead these
			// chunks are handled in the PNG file parser itself and injected
			// into this.raw map. Here, we're making sure they're included in output.
			...Array.from(this.raw)
		])
	}

}

segmentParsers.set('ihdr', Ihdr)