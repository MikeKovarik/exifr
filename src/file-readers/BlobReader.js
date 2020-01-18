import {ChunkedReader} from './ChunkedReader.js'
import {readBlobAsArrayBuffer} from './essentials.js'


export class BlobReader extends ChunkedReader {

	async readWhole() {
		this.chunked = false
		let arrayBuffer = await readBlobAsArrayBuffer(this.input)
		this._swapArrayBuffer(arrayBuffer)
	}

	readChunked() {
		this.size = this.input.size
		return super.readChunked()
	}

	async _readChunk(offset, length) {
		let end = length ? offset + length : undefined
		let blob = this.input.slice(offset, end)
		let abChunk = await readBlobAsArrayBuffer(blob)
		return this.set(abChunk, offset, true)
	}

}