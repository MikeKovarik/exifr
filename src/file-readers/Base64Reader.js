import {ChunkedReader} from './ChunkedReader.js'
import {hasBuffer} from '../util/BufferView.js'


export class Base64Reader extends ChunkedReader {

	// Accepts base64 or base64 URL and converts it to DataView and trims if needed.
	async readChunk(start, size) {
		this.chunksRead++
		// Remove the mime type and base64 marker at the beginning so that we're left off with clear b64 string.
		let base64 = this.input.replace(/^data\:([^\;]+)\;base64,/gmi, '')

		let end = size ? start + size : undefined
		let offset = 0
		// NOTE: Each 4 character block of base64 string represents 3 bytes of data.
		if (start !== undefined || end !== undefined) {
			let blockStart
			if (start === undefined) {
				blockStart = start = 0
			} else {
				blockStart = Math.floor(start / 3) * 4
				offset = start - ((blockStart / 4) * 3)
			}
			let blockEnd
			if (end === undefined) {
				blockEnd = base64.length
				end = (blockEnd / 4) * 3
			} else {
				blockEnd = Math.ceil(end / 3) * 4
			}
			base64 = base64.slice(blockStart, blockEnd)
			//let targetSize = end - start
		} else {
			//let targetSize = (base64.length / 4) * 3
		}

		if (hasBuffer) {
			let slice = Buffer.from(base64, 'base64').slice(offset, size)
			return this.set(slice, start, true)
		} else {
			let chunk = this.subarray(start, size, true)
			let binary = atob(base64)
			let uint8view = chunk.toUint8()
			for (let i = 0; i < size; i++)
				uint8view[i] = binary.charCodeAt(offset + i)
			return chunk
		}
	}

}
