import {AppSegment, parsers} from './core.js'
import {BufferView} from '../util/BufferView.js'
import {tagKeys, tagValues} from '../tags.js'


export default class Iptc extends AppSegment {

	static type = 'iptc'
	//static headerLength = 18

	static canHandle(file, offset) {
		return file.getUint8(offset + 1) === 0xED
			&& file.getString(offset + 4, 9) === 'Photoshop'
	}

	static headerLength(file, offset) {
		for (let i = 0; i < 20; i++) {
			if (this.isIptcSegmentHead(file, offset + i)) {
				// Get the length of the name header (which is padded to an even number of bytes)
				var nameHeaderLength = file.getUint8(offset + i + 7)
				if (nameHeaderLength % 2 !== 0) nameHeaderLength += 1
				// Check for pre photoshop 6 format
				if (nameHeaderLength === 0) nameHeaderLength = 4
				return i + 8 + nameHeaderLength
			}
		}
	}

	static isIptcSegmentHead(chunk, offset) {
		return chunk.getUint8(offset)     === 0x38
			&& chunk.getUint8(offset + 1) === 0x42
			&& chunk.getUint8(offset + 2) === 0x49
			&& chunk.getUint8(offset + 3) === 0x4D
			&& chunk.getUint8(offset + 4) === 0x04
			&& chunk.getUint8(offset + 5) === 0x04
	}

	parse() {
		let dict = tagKeys.iptc
		let iptc = this.output = {}
		let length = this.chunk.byteLength
		for (let offset = 0; offset < length; offset++) {
			// reading Uint8 and then another to prevent unnecessarry read of two subsequent bytes, when iterating
			if (this.chunk.getUint8(offset) === 0x1C && this.chunk.getUint8(offset + 1) === 0x02) {
				let size = this.chunk.getUint16(offset + 3)
				let tag = this.chunk.getUint8(offset + 2)
				let key = dict[tag] || tag // TODO: translate tags on demand
				let val = this.chunk.getString(offset + 5, size)
				iptc[key] = this.setValueOrArrayOfValues(val, iptc[key])
			}
		}
		return this.output
	}

	setValueOrArrayOfValues(newValue, existingValue) {
		if (existingValue !== undefined) {
			if (existingValue instanceof Array) {
				existingValue.push(newValue)
				return existingValue
			} else {
				return [existingValue, newValue]
			}
		} else {
			return newValue
		}
	}

/*
	// NOTE: reverted back to searching by the 38 42 49... bytes, because ID string could change (Photoshop 2.5, Photoshop 3)
	findIptc(buffer, offset) {
		var length = (buffer.length || buffer.byteLength) - 10
		for (var offset = 0; offset < length; offset++) {
			if (isIptcSegmentHead(buffer, offset)) {
				// Get the length of the name header (which is padded to an even number of bytes)
				var nameHeaderLength = buffer.getUint8(offset + 7)
				if (nameHeaderLength % 2 !== 0)
					nameHeaderLength += 1
				// Check for pre photoshop 6 format
				if (nameHeaderLength === 0)
					nameHeaderLength = 4
				var start = offset + 8 + nameHeaderLength
				var size = buffer.getUint16(offset + 6 + nameHeaderLength)
				var end = start + size
				return {start, size, end}
			}
		}
	}

*/

}

parsers.iptc = Iptc 