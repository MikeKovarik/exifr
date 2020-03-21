import {customError} from './helpers.mjs'
import {BigInt, hasBuffer} from '../util/platform.mjs'


const utf8decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : undefined

export function uint8ArrayToUtf8String(uint8array) {
	if (utf8decoder)
		return utf8decoder.decode(uint8array)
	else if (hasBuffer)
		return Buffer.from(uint8array).toString('utf8')
	else
		return decodeURIComponent(escape(String.fromCharCode.apply(null, uint8array)))
}

// NOTE: EXIF strings are ASCII encoded, but since ASCII is subset of UTF-8
//       we can safely use it along with TextDecoder API.
export function toAsciiString(arg) {
	if (typeof arg !== 'string')
		return uint8ArrayToUtf8String(arg)
	else
		return arg
}

const FULL_20_BITS = 0b11111111111111111111

export class BufferView {

	static from(arg, le) {
		if (arg instanceof this && arg.le === le)
			return arg
		else
			return new BufferView(arg, undefined, undefined, le)
	}

	constructor(arg, offset = 0, length, le) {
		if (typeof le === 'boolean') this.le = le
		if (Array.isArray(arg)) arg = new Uint8Array(arg)
		if (arg === 0) {
			this.byteOffset = 0
			this.byteLength = 0
		} else if (arg instanceof ArrayBuffer) {
			if (length === undefined) length = arg.byteLength - offset
			let dataView = new DataView(arg, offset, length)
			this._swapDataView(dataView)
		} else if (arg instanceof Uint8Array || arg instanceof DataView || arg instanceof BufferView) {
			// Node.js Buffer is also instance of Uint8Array, but small ones are backed
			// by single large ArrayBuffer pool, so we always need to check for arg.byteOffset.
			if (length === undefined) length = arg.byteLength - offset
			offset += arg.byteOffset
			if (offset + length > arg.byteOffset + arg.byteLength)
				throw customError('Creating view outside of available memory in ArrayBuffer')
			let dataView = new DataView(arg.buffer, offset, length)
			this._swapDataView(dataView)
		} else if (typeof arg === 'number') {
			let dataView = new DataView(new ArrayBuffer(arg))
			this._swapDataView(dataView)
		} else {
			throw customError('Invalid input argument for BufferView: ' + arg)
		}
	}

	_swapArrayBuffer(arrayBuffer) {
		this._swapDataView(new DataView(arrayBuffer))
	}

	_swapBuffer(uint8) {
		this._swapDataView(new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength))
	}

	_swapDataView(dataView) {
		this.dataView   = dataView
		this.buffer     = dataView.buffer
		this.byteOffset = dataView.byteOffset
		this.byteLength = dataView.byteLength
	}

	_lengthToEnd(offset) {
		return this.byteLength - offset
	}

	set(arg, offset, Class = BufferView) {
		if (arg instanceof DataView || arg instanceof BufferView)
			arg = new Uint8Array(arg.buffer, arg.byteOffset, arg.byteLength)
		else if (arg instanceof ArrayBuffer)
			arg = new Uint8Array(arg)
		if (!(arg instanceof Uint8Array))
			throw customError(`BufferView.set(): Invalid data argument.`)
		let uintView = this.toUint8()
		uintView.set(arg, offset)
		return new Class(this, offset, arg.byteLength)
	}

	subarray(offset, length) {
		length = length || this._lengthToEnd(offset)
		return new BufferView(this, offset, length)
	}

	// Use this for working with the same memory.
	// Returns Uint8Array view over the same memory of ArrayBuffer as the internal DataView.
	toUint8() {
		return new Uint8Array(this.buffer, this.byteOffset, this.byteLength)
	}

	// Use this for reading data.
	// Returns Uint8Array from given point in the chunk. Properly start at the begining of the chunk,
	// regardles of where the chunk is in the ArrayBuffer.
	getUint8Array(offset, length) {
		return new Uint8Array(this.buffer, this.byteOffset + offset, length)
	}

	getString(offset = 0, length = this.byteLength) {
		let arr = this.getUint8Array(offset, length)
		return uint8ArrayToUtf8String(arr)
	}

	// TODO: refactor
	getUnicodeString(offset = 0, length = this.byteLength) {
		// cannot use Uint16Array because it uses the other fucking endian order.
		const chars = []
		for (let i = 0; i < length && offset + i < this.byteLength; i += 2)
			chars.push(this.getUint16(offset + i))
		return chars.map(charCode => String.fromCharCode(charCode)).join('')
	}

	getInt8(offset)                  {return this.dataView.getInt8(offset)}
	getUint8(offset)                 {return this.dataView.getUint8(offset)}
	getInt16(offset,   le = this.le) {return this.dataView.getInt16(offset, le)}
	getInt32(offset,   le = this.le) {return this.dataView.getInt32(offset, le)}
	getUint16(offset,  le = this.le) {return this.dataView.getUint16(offset, le)}
	getUint32(offset,  le = this.le) {return this.dataView.getUint32(offset, le)}
	getFloat32(offset, le = this.le) {return this.dataView.getFloat32(offset, le)}
	getFloat64(offset, le = this.le) {return this.dataView.getFloat64(offset, le)}
	getFloat(offset,   le = this.le) {return this.dataView.getFloat32(offset, le)}
	getDouble(offset,  le = this.le) {return this.dataView.getFloat64(offset, le)}

	getUint64(offset) {
		let part1 = this.getUint32(offset)
		let part2 = this.getUint32(offset + 4)
		if (part1 < FULL_20_BITS) {
			// Warning: JS cannot handle 64-bit integers. The number will overflow and cause unexpected result
			// if the number is larger than 53. We try to handle numbers up to 52 bits. 32+21 = 53 out of which
			// one bit is needed for sign. Becase js only does 32 unsinged int (through bitwise operators).
			return (part1 << 32) | part2
		} else if (typeof BigInt !== undefined) {
			// If the environment supports BigInt we'll try to use it. Though it may break user functionality
			// (for example can't do mixed math with numbers & bigints)
			console.warn(`Using BigInt because of type 64uint but JS can only handle 53b numbers.`)
			return (BigInt(part1) << BigInt(32)) | BigInt(part2)
		} else {
			// The value (when both 32b parts combined) is larger than 53 bits so we can't just use Number type
			// and this environment doesn't support BigInt... throw error.
			throw customError(`Trying to read 64b value but JS can only handle 53b numbers.`)
		}
	}


	getUintBytes(offset, bytes, le) {
		switch (bytes) {
			case 1: return this.getUint8(offset, le)
			case 2: return this.getUint16(offset, le)
			case 4: return this.getUint32(offset, le)
			case 8: return this.getUint64(offset, le)
		}
	}

	getUint(offset, size, le) {
		switch (size) {
			case 8:  return this.getUint8(offset, le)
			case 16: return this.getUint16(offset, le)
			case 32: return this.getUint32(offset, le)
			case 64: return this.getUint64(offset, le)
		}
	}

	toString(arg) {
		return this.dataView.toString(arg, this.constructor.name)
	}

	// do not delete
	ensureChunk() {}

}