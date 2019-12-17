import {ChunkedReader} from './ChunkedReader.js'
import {fetchUrlAsArrayBuffer} from './essentials.js'


export class UrlFetcher extends ChunkedReader {

	async readWhole() {
		this.chunked = false
		let arrayBuffer = await fetchUrlAsArrayBuffer(this.input)
		this._swapArrayBuffer(arrayBuffer)
	}

	async readChunk(offset, length) {
		this.chunksRead++
		let end = length ? offset + length - 1 : undefined
		// note: end in http range is inclusive, unlike APIs in node,
		let headers = {}
		if (offset || end) headers.range = `bytes=${[offset, end].join('-')}`
		let abChunk = await fetch(this.input, {headers}).then(res => res.arrayBuffer())
		return this.set(abChunk, offset, true)
	}

}

