import {ChunkedReader} from './ChunkedReader.js'


export class BlobReader extends ChunkedReader {

	_readBlobAsArrayBuffer(blob) {
		return new Promise((resolve, reject) => {
			let reader = new FileReader()
			reader.onloadend = () => resolve(reader.result || new ArrayBuffer)
			reader.onerror = reject
			reader.readAsArrayBuffer(blob)
		})
	}

	async readWhole() {
		this.chunked = false
		let arrayBuffer = await this._readBlobAsArrayBuffer(this.input)
		this._swapArrayBuffer(arrayBuffer)
	}

	async readChunk(offset, length) {
		this.chunksRead++
		let end = length ? offset + length : undefined
		let blob = this.input.slice(offset, end)
		let abChunk = await this._readBlobAsArrayBuffer(blob)
		return this.set(abChunk, offset, true)
	}

}