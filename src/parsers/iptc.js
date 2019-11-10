import {AppSegment, parsers} from './core.js'
import {BufferView} from '../util/BufferView.js'


export default class Iptc extends AppSegment {

	parse() {
		let dictionary = tags.iptc
		let iptc = {}
		var offset = this.start
		for (var offset = 0; offset < this.end; offset++) {
			// reading Uint8 and then another to prevent unnecessarry read of two subsequent bytes, when iterating
			if (this.chunk.getUint8(offset) === 0x1C && this.chunk.getUint8(offset + 1) === 0x02) {
				let size = this.chunk.getUint16(offset + 3)
				let tag = this.chunk.getUint8(offset + 2)
				let key = dictionary[tag] || tag // TODO: translate tags on demand
				let val = this.chunk.getString(offset + 5, size)
				iptc[key] = this.setValueOrArrayOfValues(val, iptc[key])
			}
		}
		this.output = this.options.mergeOutput ? {iptc} : iptc
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

	// NOTE: This only works with single segment IPTC data.
	// TODO: Implement multi-segment parsing.
	//function findIptc(buffer, offset = 0) {
	//	return findAppSegment(buffer, 13, isIptcSegment, getIptcSize)
	//}
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

	isIptcSegmentHead(buffer, offset) {
		return buffer.getUint8(offset)     === 0x38
			&& buffer.getUint8(offset + 1) === 0x42
			&& buffer.getUint8(offset + 2) === 0x49
			&& buffer.getUint8(offset + 3) === 0x4D
			&& buffer.getUint8(offset + 4) === 0x04
			&& buffer.getUint8(offset + 5) === 0x04
	}
*/
}

parsers.iptc = Iptc 