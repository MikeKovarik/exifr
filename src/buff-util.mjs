export var hasBuffer = typeof Buffer !== 'undefined'
export var isBrowser = typeof navigator !== 'undefined'
export var isWorker = isBrowser && typeof HTMLImageElement === 'undefined'
export var isNode = typeof global !== 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node

// Web Browser's binary data are stored in ArrayBuffer. To access it we can use
// DataView class which has similar methods to Node's Buffer class.
// This file contains methods that smooth the process of using etiher DataView o Buffer
// in the parser code.

export function getUint8(buffer, offset) {
	if (buffer.getUint8)	return buffer.getUint8(offset)
	else					return buffer[offset]
}

export function getInt8(buffer, offset) {
	if (buffer.getUint8)	return buffer.getUint8(offset)
	else					return buffer.readInt8(offset)
}

export function getUint16(buffer, offset, littleEndian = false) {
	if (buffer.getUint16)	return buffer.getUint16(offset, littleEndian)
	else if (littleEndian)	return buffer.readUInt16LE(offset)
	else					return buffer.readUInt16BE(offset)
}

export function getInt16(buffer, offset, littleEndian = false) {
	if (buffer.getInt16)	return buffer.getInt16(offset, littleEndian)
	else if (littleEndian)	return buffer.readInt16LE(offset)
	else					return buffer.readInt16BE(offset)
}

export function getUint32(buffer, offset, littleEndian = false) {
	if (buffer.getUint32)	return buffer.getUint32(offset, littleEndian)
	else if (littleEndian)	return buffer.readUInt32LE(offset)
	else					return buffer.readUInt32BE(offset)
}

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
export function slice(buffer, start, end) {
	if (buffer.slice)
		return buffer.slice(start, end)
	else
		return (new Uint8Array(buffer.buffer)).subarray(start, end)
}

// NOTE: EXIF strings are ASCII encoded, but since ASCII is subset of UTF-8
//       we can safely use it along with TextDecoder API.
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

export class BufferCursor {

	constructor(buffer, offset, littleEndian) {
		this.buffer = buffer
		this.offset = offset || 0
		this.littleEndian = littleEndian
	}

	getUint(bytes) {
		switch (bytes) {
			case 1: return this.getUint8()
			case 2: return this.getUint16()
			case 4: return this.getUint32()
		}
	}

	getUint8() {
		let result = getUint8(this.buffer, this.offset)
		this.offset += 1
		return result
	}

	getUint16() {
		let result = getUint16(this.buffer, this.offset, this.littleEndian)
		this.offset += 2
		return result
	}

	getUint32() {
		let result = getUint32(this.buffer, this.offset, this.littleEndian)
		this.offset += 4
		return result
	}

}





const utf8  = new TextDecoder('utf-8')
const utf16 = new TextDecoder('utf-16')

export class BufferView {

	static from(arg, offset = 0, length) {
		if (arg instanceof ArrayBuffer)
			var view = new DataView(arg, offset, length)
		else if (offset > 0 || arg instanceof Uint8Array)
			var view = new DataView(arg.buffer, arg.byteOffset + offset, length)
		else if (arg instanceof DataView)
			var view = arg
		return new this(view)
	}

	constructor(arg, littleEndian) {
		this.changeBuffer(arg)
		this.le = littleEndian
	}

	changeBuffer(arg) {
		if (arg instanceof DataView)
			this.view = arg
		else if (arg instanceof ArrayBuffer)
			this.view = new DataView(arg)
		else if (arg instanceof Uint8Array)
			this.view = new DataView(arg.buffer, arg.byteOffset, arg.byteLength)
			// Node.js Buffer is also instance of Uint8Array
		// Make this object seem similar to DataView
		this.buffer = this.view.buffer
		this.byteOffset = this.view.byteOffset
		this.byteLength = this.view.byteLength
	}

	getUint8(offset) {
		return this.view.getUint8(offset)
	}

	getUint16(offset, le = this.le) {
		return this.view.getUint16(offset, le)
	}

	getUint32(offset, le = this.le) {
		return this.view.getUint32(offset, le)
	}

	getString(offset = 0, length = this.view.byteLength) {
		let arr = new Uint8Array(this.view.buffer, this.view.byteOffset + offset, length)
		return utf8.decode(arr)
	}

	// TODO: refactor
	getUnicodeString(offset = 0, length = this.view.byteLength) {
		// cannot use Uint16Array because it uses the other fucking endian order.
		const chars = []
		let view = this.view
		for (let i = 0; i < length && offset + i < view.byteLength; i += 2)
			chars.push(view.getUint16(offset + i))
		return chars.map(charCode => String.fromCharCode(charCode)).join('')
	}

	toString() {
		return this.view.toString()
	}

}

export class BufferCursor2 extends BufferView {

	constructor(arg, offset, littleEndian) {
		super(arg, offset, littleEndian)
		this.offset = offset || 0
	}

	changeBuffer(arg) {
		super.changeBuffer(arg)
		this.offset = 0
	}

	getUint(bytes) {
		switch (bytes) {
			case 1: return this.getUint8()
			case 2: return this.getUint16()
			case 4: return this.getUint32()
		}
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
