export var hasBuffer = typeof Buffer !== 'undefined'
export var isBrowser = typeof navigator !== 'undefined'
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

export function getUint32(buffer, offset, littleEndian = false) {
	if (buffer.getUint32)	return buffer.getUint32(offset, littleEndian)
	else if (littleEndian)	return buffer.readUInt32LE(offset)
	else					return buffer.readUInt32BE(offset)
}

export function getInt16(buffer, offset, littleEndian = false) {
	if (buffer.getInt16)	return buffer.getInt16(offset, littleEndian)
	else if (littleEndian)	return buffer.readInt16LE(offset)
	else					return buffer.readInt16BE(offset)
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
export function toString(buffer, start, end) {
	if (buffer instanceof DataView) {
		if (hasBuffer) {
			return Buffer.from(buffer.buffer)
				.slice(start, end)
				.toString('ascii', start, end)
		} else {
			var decoder = new TextDecoder('utf-8')
			return decoder.decode(slice(buffer, start, end))
		}
	} else {
		return buffer.toString('ascii', start, end)
	}
}