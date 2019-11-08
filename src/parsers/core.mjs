import {BufferView} from '../util/BufferView.mjs'
import createOptions from '../options.mjs'


/*
offset = where FF En starts
length = size of the whole appN segment (header/marker + content)
start  = start of the content
size   = size of the content. i.e. from start till end
end    = end of the content (as well as the appN segment)
*/
export class AppSegment {

	static headerLength = 4

	// output is merged into library output or is assigned with parser id
	static mergeOutput = false
	static type = undefined

	static canHandle = () => false

	// offset + length === end  |  begining and end of the whole segment, including the segment header 0xFF 0xEn + two lenght bytes.
	// start  + size   === end  |  begining and end of parseable content
	static findPosition(buffer, offset) {
		// length at offset+2 is the size of appN content plus the two appN length bytes. it does not include te appN 0xFF 0xEn marker.
		var length = buffer.getUint16(offset + 2) + 2
		var start = offset + this.headerLength
		var size = length - this.headerLength
		var end = start + size
		return {offset, length, start, size, end}
	}

	static parse(buffer, start, options) {
		if (typeof start === 'object') {
			options = start
			start = undefined
		}
		let view = new BufferView(buffer, start)
		let instance = new this(view, createOptions(options))
		return instance.parse()
	}

	constructor(chunk, options, file) {
		this.chunk = chunk
		this.options = options
		this.file = file
	}

}

export var parsers = {}