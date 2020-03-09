import {fileReaders} from '../plugins.mjs'
import {readBlobAsArrayBuffer} from '../reader.mjs'
import {ChunkedReader} from './ChunkedReader.mjs'


export class BlobReader extends ChunkedReader {

	async readWhole() {
		this.chunked = false
		let arrayBuffer = await readBlobAsArrayBuffer(this.input)
		this._swapArrayBuffer(arrayBuffer)
	}

	readChunked() {
		this.chunked = true
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

fileReaders.set('blob', BlobReader)