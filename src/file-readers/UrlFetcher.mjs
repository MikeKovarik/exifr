import {fileReaders} from '../plugins.mjs'
import {fetchUrlAsArrayBuffer} from '../reader.mjs'
import {ChunkedReader} from './ChunkedReader.mjs'


export class UrlFetcher extends ChunkedReader {

	async readWhole() {
		this.chunked = false
		let arrayBuffer = await fetchUrlAsArrayBuffer(this.input)
		this._swapArrayBuffer(arrayBuffer)
	}

	async _readChunk(offset, length) {
		let end = length ? offset + length - 1 : undefined
		// note: end in http range is inclusive, unlike APIs in node,
		let headers = {}
		if (offset || end) headers.range = `bytes=${[offset, end].join('-')}`
		let res = await fetch(this.input, {headers})
		let abChunk = await res.arrayBuffer()
		let bytesRead = abChunk.byteLength
		if (res.status === 416) return undefined
		if (bytesRead !== length) this.size = offset + bytesRead
		return this.set(abChunk, offset, true)
	}

}

fileReaders.set('url', UrlFetcher)