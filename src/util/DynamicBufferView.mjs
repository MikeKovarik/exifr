import * as platform from './platform.mjs'
import {BufferView} from './BufferView.mjs'
//import {throwError} from './helpers.mjs'
import {Buffer} from './platform.mjs'


export class DynamicBufferView extends BufferView {

	ranges = new Ranges

	constructor(...args) {
		super(...args)
		if (this.byteLength !== 0)
			this.ranges.add(0, this.byteLength)
	}

	_tryExtend(offset, length, abChunk) {
		if (offset === 0 && this.byteLength === 0 && abChunk) {
			// we can receive ArrayBuffer or Buffer
			let dataView = new DataView(abChunk.buffer || abChunk, abChunk.byteOffset, abChunk.byteLength)
			this._swapDataView(dataView)
		} else {
			let end = offset + length
			if (end > this.byteLength) {
				let {dataView} = this._extend(end)
				this._swapDataView(dataView)
			}
		}
	}

	_extend(newLength) {
		let uintView
		if (platform.hasBuffer)
			uintView = Buffer.allocUnsafe(newLength)
		else
			uintView = new Uint8Array(newLength)
		let dataView = new DataView(uintView.buffer, uintView.byteOffset, uintView.byteLength)
		uintView.set(new Uint8Array(this.buffer, this.byteOffset, this.byteLength), 0)
		return {uintView, dataView}
	}

	subarray(offset, length, canExtend = false) {
		length = length || this._lengthToEnd(offset)
		if (canExtend) this._tryExtend(offset, length)
		this.ranges.add(offset, length)
		return super.subarray(offset, length)
	}

	// TODO: write tests for extending .set()
	set(arg, offset, canExtend = false) {
		if (canExtend) this._tryExtend(offset, arg.byteLength, arg)
		let chunk = super.set(arg, offset)
		this.ranges.add(offset, chunk.byteLength)
		return chunk
	}

	async ensureChunk(offset, length) {
		if (!this.chunked) return
		if (this.ranges.available(offset, length)) return
		await this.readChunk(offset, length)
	}

	// Returns bool indicating wheter buffer contains useful data (read from file) at given offset/length
	// or if its so far only allocated & unitialized memory ready to be written into.
	available(offset, length) {
		return this.ranges.available(offset, length)
	}

}

export class Ranges {

	list = []

	get length() {
		return this.list.length
	}

	// TODO: add padding - because it's better to do just one disk read instead of two
	//       even though there are a few unused bytes between the two needed ranges
	add(offset, length, padding = 0) {
		let end = offset + length
		let within = this.list.filter(range => isBetween(offset, range.offset, end) || isBetween(offset, range.end, end))
		if (within.length > 0) {
			offset = Math.min(offset, ...within.map(range => range.offset))
			end    = Math.max(end,    ...within.map(range => range.end))
			length = end - offset
			let range = within.shift()
			range.offset = offset
			range.length = length
			range.end    = end
			this.list = this.list.filter(range => !within.includes(range))
		} else {
			this.list.push({offset, length, end})
		}
	}

	// Returns bool indicating wheter buffer contains useful data (read from file) at given offset/length
	// or if its so far only allocated & unitialized memory ready to be written into.
	available(offset, length) {
		let end = offset + length
		return this.list.some(range => range.offset <= offset && end <= range.end)
	}

}

function isBetween(min, val, max) {
	return min <= val && val <= max
}
