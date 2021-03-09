import {fileReaders} from '../plugins.mjs'
import {ChunkedReader} from './ChunkedReader.mjs'

export class ExternalReader extends ChunkedReader {

	async readWhole() {
		this.chunked = false
		let arrayBuffer = await this.options.externalReader(this.input)
		this._swapArrayBuffer(arrayBuffer)
	}

	async _readChunk(offset, length) {
		let abChunk = await this.options.externalReader(this.input, offset, length)
		if (typeof abChunk === 'undefined') return undefined
		let bytesRead = abChunk.byteLength
		if (bytesRead !== length) this.size = offset + bytesRead
		return this.set(abChunk, offset, true)
	}

}

fileReaders.set('external', ExternalReader)