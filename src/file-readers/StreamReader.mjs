import {ChunkedReader} from './ChunkedReader.mjs'
import {fileReaders} from '../plugins.mjs'

export class StreamReader extends ChunkedReader {
    myOffset = 0
    previousChunks = {}

	async readWhole() {
		this.chunked = false
        const buffer = []
        while ((chunk=this.input.read()) != null) {
            buffer.push(chunk)
        }
		this._swapBuffer(Buffer.concat(buffer))
	}

	async readChunked() {
		this.chunked = true
		await this.open()
		await this.readChunk(0, this.options.firstChunkSize)
	}

    async open() {
        if (!this.readable) {
            await new Promise((resolve) => {
                this.input.on('readable', resolve)
            })
            this.readable = true
        }
    }

    async _readChunk(offset, length) {
        let chunk

        if (offset === 0) {
            chunk = this.input.read(length - this.myOffset);
        } else {
            // Drop
            this.input.read(offset - this.myOffset);
            chunk = this.input.read(length);
        }

        // EOF
        if (chunk === null) {
            chunk = this.input.read();
            //this.size = this.nextChunkOffset
            this.size = this.myOffset + chunk.size
        }

        this.myOffset += chunk.length

        let finalChunk

        if (this.previousChunks[offset]) {
            finalChunk = Buffer.concat([this.previousChunks[offset], chunk]);
        } else {
            finalChunk = chunk
            this.previousChunks[offset] = chunk
        }

        // read the chunk into newly created/extended chunk of the dynamic buffer.
		const extendedChunk = this.set(finalChunk, offset, true)

		return extendedChunk
	}
}

fileReaders.set('stream', StreamReader)