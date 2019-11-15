import {BufferView} from '../util/BufferView.js'
import createOptions from '../options.js'
import {tagKeys, tagValues} from '../tags.js'


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
		let length = buffer.getUint16(offset + 2) + 2
		let headerLength = typeof this.headerLength === 'function' ? this.headerLength(buffer, offset, length) : this.headerLength
		let start = offset + headerLength
		let size = length - headerLength
		let end = start + size
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

	constructor(chunk, options = {}, file) {
		this.chunk = chunk
		this.options = options
		this.file = file

		let Ctor = this.constructor
		let type = Ctor.type
		let segOptions = options[type] || {}
		let optionProps = ['translateTags', 'translateValues', 'reviveValues']
		for (let prop of optionProps)
			this[prop] = pickDefined(Ctor[prop], segOptions[prop], options[prop])

		this.canTranslate = this.translateTags || this.translateValues || this.reviveValues
	}

	// can be overriden by parses (namely TIFF) that inherits from this base class.
	translate() {
		if (this.canTranslate) {
			let type = this.constructor.type
			this.output = this.translateBlock(tagKeys[type], tagValues[type], this.output)
		}
	}

	// split into separate function so that it can be used by TIFF but shared with other parsers.
	translateBlock(keyDict, valDict, rawTags) {
		let entries = Object.entries(rawTags)
		//if (this.options.reviveValues)
		//	entries = entries.map(([tag, val]) => [tag, translateValue(tag, val)])
		if (this.options.translateValues && valDict)
			entries = entries.map(([tag, val]) => [tag, this.translateValue(val, valDict[tag]) || val])
		if (this.options.translateTags && keyDict)
			entries = entries.map(([tag, val]) => [keyDict[tag] || tag, val])
		return Object.fromEntries(entries)
	}

	// can be overriden by parses (namely ICC) that inherits from this base class.
	translateValue(val, dict) {
		return dict && dict[val]
	}

}

const isDefined = val => val !== undefined

const pickDefined = (...values) => values.find(isDefined)

export var parsers = {}