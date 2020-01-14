import {ChunkedReader} from './ChunkedReader.js'
import {isNode} from '../util/BufferView.js'


if (isNode) {
	if (typeof require === 'function')
		var fsPromise = Promise.resolve(require('fs').promises)
	else
		var fsPromise = import(/* webpackIgnore: true */ 'fs').then(module => module.promises)
}

export class FsReader extends ChunkedReader {

	async readWhole() {
		this.chunked = false
		this.fs = await fsPromise
		let buffer = await this.fs.readFile(this.input)
		this._swapBuffer(buffer)
	}

	async readChunked() {
		this.chunked = true
		this.fs = await fsPromise
		await this.open()
		await this.readChunk(0, this.options.firstChunkSize)
	}

	async open() {
		if (this.fh === undefined) {
			this.fh = await this.fs.open(this.input, 'r')
			this.size = (await this.fh.stat(this.input)).size
		}
	}

	async _readChunk(offset, length) {
		// reopen if needed
		if (this.fh === undefined) await this.open()
		// stay within file-size boundaries
		if (offset + length > this.size)
			length = this.size - offset
		// read the chunk into newly created/extended chunk of the dynamic buffer.
		var chunk = this.subarray(offset, length, true)
		await this.fh.read(chunk.dataView, 0, length, offset)
		return chunk
	}

	// TODO: auto close file handle when reading and parsing is over
	// (app can read more chunks after parsing the first)
	async close() {
		if (this.fh) {
			let fh = this.fh
			this.fh = undefined
			await fh.close()
		}
	}

}