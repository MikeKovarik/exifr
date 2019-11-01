export var hasBuffer = typeof Buffer !== 'undefined'
export var isBrowser = typeof navigator !== 'undefined'
export var isWorker = isBrowser && typeof HTMLImageElement === 'undefined'
export var isNode = typeof global !== 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node

// Web Browser's binary data are stored in ArrayBuffer. To access it we can use
// DataView class which has similar methods to Node's Buffer class.
// This file contains methods that smooth the process of using etiher DataView o Buffer
// in the parser code.

// TODO: deprecate
export function getUint8(buffer, offset) {
	if (buffer.getUint8)	return buffer.getUint8(offset)
	else					return buffer[offset]
}

// TODO: deprecate
export function getInt8(buffer, offset) {
	if (buffer.getUint8)	return buffer.getUint8(offset)
	else					return buffer.readInt8(offset)
}

// TODO: deprecate
export function getUint16(buffer, offset, littleEndian = false) {
	if (buffer.getUint16)	return buffer.getUint16(offset, littleEndian)
	else if (littleEndian)	return buffer.readUInt16LE(offset)
	else					return buffer.readUInt16BE(offset)
}

// TODO: deprecate
export function getInt16(buffer, offset, littleEndian = false) {
	if (buffer.getInt16)	return buffer.getInt16(offset, littleEndian)
	else if (littleEndian)	return buffer.readInt16LE(offset)
	else					return buffer.readInt16BE(offset)
}

// TODO: deprecate
export function getUint32(buffer, offset, littleEndian = false) {
	if (buffer.getUint32)	return buffer.getUint32(offset, littleEndian)
	else if (littleEndian)	return buffer.readUInt32LE(offset)
	else					return buffer.readUInt32BE(offset)
}

// TODO: deprecate
export function getInt32(buffer, offset, littleEndian = false) {
	if (buffer.getInt32)	return buffer.getInt32(offset, littleEndian)
	else if (littleEndian)	return buffer.readInt32LE(offset)
	else					return buffer.readInt32BE(offset)
}

// KEEP IN MIND!
// Node's buffer.slice() returns new Buffer pointing to the same memory.
// Web's arrayBuffer.slice() returns new ArrayBuffer with newly copied data.
// Web's arrayBuffer.subarray() returns new ArrayBuffer pointing to the same memory. Just like Node's buffer.slice.
// NOTE: We're only using this method when we're outputting unprocessed slices of binary data to user.
//       Internally we just use the original ArrayBuffer with offsets because wrapping a slice in DataView
//       Would just return view over the whole original ArrayBuffer.
// TODO: deprecate
export function slice(buffer, start, end) {
	if (buffer.slice)
		return buffer.slice(start, end)
	else
		return (new Uint8Array(buffer.buffer)).subarray(start, end)
}

// NOTE: EXIF strings are ASCII encoded, but since ASCII is subset of UTF-8
//       we can safely use it along with TextDecoder API.
// TODO: deprecate
export function toString(buffer, start = 0, end) {
	if (buffer instanceof DataView) {
		/*
		if (hasBuffer) {
			// warning: small buffers are shared in one big arraybuffer pool. creating node buffer from buffer.buffer arraybuffer can lead to unexpected outputs if not handled with buffer.byteOffset
			return Buffer.from(buffer.buffer)
				//.slice(buffer.byteOffset, buffer.byteLength)
				.slice(start, end)
				.toString('ascii', start, end)
		} else {
		*/
			var decoder = new TextDecoder('utf-8')
			if (start && end)
				return decoder.decode(slice(buffer, start, end))
			else
				return decoder.decode(buffer)
		//}
	} else {
		return buffer.toString('ascii', start, end)
	}
}


const utf8  = new TextDecoder('utf-8')
//const utf16 = new TextDecoder('utf-16')

export class BufferViewCore {

	constructor(arg, offset = 0, length) {
		if (arg instanceof ArrayBuffer) {
			let dataView = new DataView(arg, offset, length)
			this._applyDataViewProps(dataView)
		} else if (arg instanceof Uint8Array || arg instanceof DataView || arg instanceof BufferView) {
			// Node.js Buffer is also instance of Uint8Array, but small ones are backed
			// by single large ArrayBuffer pool, so we always need to check for arg.byteOffset.
			let {byteOffset, byteLength} = arg
			if (length === undefined) length = byteLength - offset
			offset += byteOffset
			if (offset + length > byteOffset + byteLength)
				throw new Error('Creating view outside of available memory in ArrayBuffer')
			let dataView = new DataView(arg.buffer, offset, length)
			this._applyDataViewProps(dataView)
		} else if (typeof arg === 'number') {
			let dataView = new DataView(new ArrayBuffer(arg))
			this._applyDataViewProps(dataView)
		} else {
			throw new Error('Invalid input argument for BufferView: ' + arg)
		}
	}

	_applyDataViewProps(dataView) {
		this.dataView   = dataView
		this.buffer     = this.dataView.buffer
		this.byteOffset = this.dataView.byteOffset
		this.byteLength = this.dataView.byteLength
	}

	subarray(offset, length) {
		return new this.constructor(this, offset, length)
	}

	//set(view, offset) {}

	getString(offset = 0, length = this.byteLength) {
		let arr = new Uint8Array(this.buffer, this.byteOffset + offset, length)
		return utf8.decode(arr)
	}

	// TODO: refactor
	getUnicodeString(offset = 0, length = this.byteLength) {
		// cannot use Uint16Array because it uses the other fucking endian order.
		const chars = []
		for (let i = 0; i < length && offset + i < this.byteLength; i += 2)
			chars.push(this.getUint16(offset + i))
		return chars.map(charCode => String.fromCharCode(charCode)).join('')
	}

	getUint8(offset)       {return this.dataView.getUint8(offset)}
	getUint16(offset, le)  {return this.dataView.getUint16(offset,le)}
	getUint32(offset, le)  {return this.dataView.getUint32(offset,le)}
	getInt8(offset)        {return this.dataView.getInt8(offset)}
	getInt16(offset, le)   {return this.dataView.getInt16(offset,le)}
	getInt32(offset, le)   {return this.dataView.getInt32(offset,le)}
	getFloat16(offset, le) {return this.dataView.getFloat16(offset,le)}
	getFloat32(offset, le) {return this.dataView.getFloat32(offset,le)}

	getUint(bytes) {
		switch (bytes) {
			case 1: return this.getUint8()
			case 2: return this.getUint16()
			case 4: return this.getUint32()
		}
	}

	toString(arg) {
		return this.dataView.toString(arg, this.constructor.name)
	}

}


function isBetween(min, val, max) {
	return min <= val && val <= max
}

export class BufferView extends BufferViewCore {

	bytesRead = 0

	ranges = []

	constructor(...args) {
		super(...args)
		this._registerRange(0, this.byteLength)
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
		this._registerRange(this.byteLength, chunk.byteLength)
		this._applyDataViewProps(dataView)
	}

	subarray(offset, length, canExtend = false) {
		let end = offset + length
		if (end > this.byteLength && canExtend) {
			let {dataView} = this._extend(end)
			this._applyDataViewProps(dataView)
		}
		this._registerRange(offset, length)
		return super.subarray(offset, length)
	}

	// Returns bool indicating wheter buffer contains useful data (read from file) at given offset/length
	// or if its so far only allocated & unitialized memory ready to be written into.
	isRangeRead(offset, length) {
		let end = offset + length
		return this.ranges.some(range => range.offset <= offset && end <= range.end)
	}

	_registerRange(offset, length) {
		let end = offset + length
		let within = this.ranges.filter(range => isBetween(offset, range.offset, end) || isBetween(offset, range.end, end))
		if (within.length > 0) {
			offset = Math.min(offset, ...within.map(range => range.offset))
			end    = Math.max(end,    ...within.map(range => range.end))
			length = end - offset
			let range = within.shift()
			range.offset = offset
			range.length = length
			range.end    = end
			this.ranges = this.ranges.filter(range => !within.includes(range))
		} else {
			this.ranges.push({offset, length, end})
		}
	}

}


export class CursorView extends BufferView {

	constructor(...args) {
		super(...args)
		this.offset = 0
	}

	getUint8() {
		let result = super.getUint8(this.offset)
		this.offset += 1
		return result
	}

	getUint16() {
		let result = super.getUint16(this.offset)
		this.offset += 2
		return result
	}

	getUint32() {
		let result = super.getUint32(this.offset)
		this.offset += 4
		return result
	}

	getString(size) {
		let result = super.getString(this.offset, size)
		this.offset += size
		return result
	}

}
