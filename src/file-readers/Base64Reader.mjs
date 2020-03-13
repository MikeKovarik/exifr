import {fileReaders} from '../plugins.mjs'
import {ChunkedReader} from './ChunkedReader.mjs'
import * as platform from '../util/platform.mjs'
import {Buffer} from '../util/platform.mjs'


export class Base64Reader extends ChunkedReader {

	constructor(...args) {
		super(...args)
		// Remove the mime type and base64 marker at the beginning so that we're left off with clear b64 string.
		this.input = this.input.replace(/^data:([^;]+);base64,/gmi, '')
		
		this.size = (this.input.length / 4) * 3
		if (this.input.endsWith('=='))     this.size -= 2
		else if (this.input.endsWith('=')) this.size -= 1
	}

	// Accepts base64 or base64 URL and converts it to DataView and trims if needed.
	async _readChunk(offset, length) {
		let base64 = this.input
		// Base64 encodes 3 bytes of data into string of 4 characters.
		// To extract bytes at certain offset and length we need to take that into account,
		// recalculate the offset and length into blocks of 4 characters, slice the input base64 string
		// from these first and last of these blocks, and finally adjust correct offset in these blocks.
		// NOTE: Each 4 character block of base64 string represents 3 bytes of data.
		let blockStart, offsetInBlock
		if (offset === undefined) {
			// Start from begining of the 4-letter block.
			offset = 0
			blockStart = 0
			offsetInBlock = 0
		} else {
			// Adjust offset from the start of the 4-letter block.
			blockStart = Math.floor(offset / 3) * 4
			offsetInBlock = offset - ((blockStart / 4) * 3)
		}
		if (length === undefined) {
			length = this.size
		}
		let end = offset + length
		let blockEnd = blockStart + Math.ceil(end / 3) * 4
		base64 = base64.slice(blockStart, blockEnd)

		let clampedLength = Math.min(length, this.size - offset)
		if (platform.hasBuffer) {
			let slice = Buffer.from(base64, 'base64').slice(offsetInBlock, offsetInBlock + clampedLength)
			return this.set(slice, offset, true)
		} else {
			let chunk = this.subarray(offset, clampedLength, true)
			let binary = atob(base64)
			let uint8view = chunk.toUint8()
			for (let i = 0; i < clampedLength; i++)
				uint8view[i] = binary.charCodeAt(offsetInBlock + i)
			return chunk
		}
	}

}

fileReaders.set('base64', Base64Reader)