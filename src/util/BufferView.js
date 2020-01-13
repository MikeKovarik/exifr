export var hasBuffer = typeof Buffer !== 'undefined'
export var isBrowser = typeof navigator !== 'undefined'
export var isWorker = isBrowser && typeof HTMLImageElement === 'undefined'
export var isNode = typeof global !== 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node


const utf8 = new TextDecoder('utf-8')
//const utf16 = new TextDecoder('utf-16')

// NOTE: EXIF strings are ASCII encoded, but since ASCII is subset of UTF-8
//       we can safely use it along with TextDecoder API.
export function toAsciiString(arg) {
	if (typeof arg !== 'string')
		return uint8ArrayToAsciiString(arg)
	else
		return arg
}

export function uint8ArrayToAsciiString(uint8array) {
	return utf8.decode(uint8array)
}

const FULL_20_BITS = parseInt('1'.repeat(20), 2)

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
		if (arg instanceof ArrayBuffer) {
			let dataView = new DataView(arg, offset, length)
			this._swapDataView(dataView)
		} else if (arg instanceof Uint8Array || arg instanceof DataView || arg instanceof BufferView) {
			// Node.js Buffer is also instance of Uint8Array, but small ones are backed
			// by single large ArrayBuffer pool, so we always need to check for arg.byteOffset.
			let {byteOffset, byteLength} = arg
			if (length === undefined) length = byteLength - offset
			offset += byteOffset
			if (offset + length > byteOffset + byteLength)
				throw new Error('Creating view outside of available memory in ArrayBuffer')
			let dataView = new DataView(arg.buffer, offset, length)
			this._swapDataView(dataView)
		} else if (typeof arg === 'number') {
			let dataView = new DataView(new ArrayBuffer(arg))
			this._swapDataView(dataView)
		} else {
			throw new Error('Invalid input argument for BufferView: ' + arg)
		}
	}

	_swapArrayBuffer(arrayBuffer) {
		let dataView = new DataView(arrayBuffer)
		this._swapDataView(dataView)
	}

	_swapBuffer(uint8) {
		let dataView = new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength)
		this._swapDataView(dataView)
	}

	_swapDataView(dataView) {
		this.dataView   = dataView
		this.buffer     = this.dataView.buffer
		this.byteOffset = this.dataView.byteOffset
		this.byteLength = this.dataView.byteLength
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
			throw new Error(`BufferView.set(): Invalid data argument.`)
		let uintView = this.toUint8()
		uintView.set(arg, offset)
		return new Class(this, offset, arg.byteLength)
	}

	subarray(offset, length) {
		length = length || this._lengthToEnd(offset)
		return new BufferView(this, offset, length)
	}

	toUint8() {
		return new Uint8Array(this.buffer, this.byteOffset, this.byteLength)
	}

	getUint8Array(offset, length) {
		return new Uint8Array(this.buffer, this.byteOffset + offset, length)
	}

	getString(offset = 0, length = this.byteLength) {
		let arr = new Uint8Array(this.buffer, this.byteOffset + offset, length)
		return uint8ArrayToAsciiString(arr)
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
			console.warn(`Using BigInt because box ${kind} has length of type 64uint but JS can only handle 53b numbers.`)
			return (BigInt(part1) << 32n) | BigInt(part2)
		} else {
			console.warn(`Integrity broken. Box ${kind} has length of type 64uint but JS can only handle 53b numbers.`)
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
	ensureRange() {}

}


function isBetween(min, val, max) {
	return min <= val && val <= max
}

export class DynamicBufferView extends BufferView {

	ranges = new Ranges

	constructor(...args) {
		super(...args)
		this.ranges.add(0, this.byteLength)
	}

	_tryExtend(offset, length) {
		let end = offset + length
		if (end > this.byteLength) {
			let {dataView} = this._extend(end)
			this._swapDataView(dataView)
		}
	}

	_extend(newLength, unsafe = true) {
		if (hasBuffer && unsafe)
			var uintView = Buffer.allocUnsafe(newLength)
		else
			var uintView = new Uint8Array(newLength)
		let dataView = new DataView(uintView.buffer, uintView.byteOffset, uintView.byteLength)
		uintView.set(new Uint8Array(this.buffer, this.byteOffset, this.byteLength), 0)
		return {uintView, dataView}
	}

	append(chunk) {
		if (chunk instanceof DataView || chunk instanceof BufferView)
			chunk = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
		else if ((!chunk instanceof Uint8Array))
			throw new Error('Invalid chunk type to extend with')
		let {uintView, dataView} = this._extend(this.byteLength + chunk.byteLength)
		uintView.set(chunk, this.byteLength)
		this.ranges.add(this.byteLength, chunk.byteLength)
		this._swapDataView(dataView)
	}

	subarray(offset, length, canExtend = false) {
		length = length || this._lengthToEnd(offset)
		if (canExtend) this._tryExtend(offset, length)
		this.ranges.add(offset, length)
		return super.subarray(offset, length)
	}

	// TODO: write tests for extending .set()
	set(arg, offset, canExtend = false) {
		if (canExtend) this._tryExtend(offset, arg.byteLength)
		let chunk = super.set(arg, offset)
		this.ranges.add(offset, chunk.byteLength)
		return chunk
	}

	async ensureRange(offset, length) {
		if (!this.chunked) return
		if (this.range.available(offset, length)) return
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