import {DynamicBufferView} from '../util/DynamicBufferView.mjs'


// This method came through three iterations. Tested with 4MB file with EXIF at the beginning.
// iteration #1 - Fetch whole file.
//              - Took about 23ms on average.
//              - It meant unnecessary conversion of whole 4MB
// iteration #2 - Fetch first 512 bytes, find exif, then fetch additional kilobytes of exif to be parsed.
//              - Exactly like what we do with Node's readFile() method.
//              - Slightly faster. 18ms on average.
//              - Certainly more efficient processing-wise. Only beginning of the file was read and converted.
//              - But the additional read of the exif chunk is expensive time-wise because browser's fetch and
//              - Blob<->ArrayBuffer manipulations are not as fast as Node's low-level fs.open() & fs.read().
// iteration #3 - This one we landed on.
//              - 11ms on average. (As fast as Node)
//              - Compromise between time and processing costs.
//              - Fetches first 64KB of the file. In most cases, EXIF isn't larger than that.
//              - In most cases, the 64KB is enough and we don't need additional fetch/convert operation.
//              - But we can do the second read if needed (edge cases) where the performance wouldn't be great anyway.
// It can be used with Blobs, URLs, Base64 (URL).
// blobs and fetching from url uses larger chunks with higher chances of having the whole exif within (iteration 3).
// base64 string (and base64 based url) uses smaller chunk at first (iteration 2).

// Accepts file path and uses lower-level FS APIs to open the file, read the first 512 bytes
// trying to locate EXIF and then reading only the portion of the file where EXIF is if found.
// If the EXIF is not found within the first 512 Bytes. the range can be adjusted by user,
// or it falls back to reading the whole file if enabled with options.allowWholeFile.

export class ChunkedReader extends DynamicBufferView {

	constructor(input, options) {
		super(0)
		this.input = input
		this.options = options
	}

	chunksRead = 0

	async readWhole() {
		this.chunked = false
		await this.readChunk(this.nextChunkOffset)
	}

	async readChunked() {
		this.chunked = true
		await this.readChunk(0, this.options.firstChunkSize)
	}

	async readNextChunk(offset = this.nextChunkOffset) {
		if (this.fullyRead) {
			this.chunksRead++
			return false
		}
		let sizeToRead = this.options.chunkSize
		let chunk = await this.readChunk(offset, sizeToRead)
		if (chunk) return chunk.byteLength === sizeToRead
		return false
	}

	// todo: only read unread bytes. ignore overlaping bytes.
	async readChunk(offset, length) {
		this.chunksRead++
		length = this.safeWrapAddress(offset, length)
		if (length === 0) return undefined
		return this._readChunk(offset, length)
	}

	safeWrapAddress(offset, length) {
		if (this.size !== undefined && offset + length > this.size)
			return Math.max(0, this.size - offset)
		return length
	}

	get nextChunkOffset() {
		if (this.ranges.list.length !== 0)
			return this.ranges.list[0].length
	}

	get canReadNextChunk() {
		return this.chunksRead < this.options.chunkLimit
	}

	get fullyRead() {
		if (this.size === undefined) return false
		return this.nextChunkOffset === this.size
	}

	read() {
		if (this.options.chunked)
			return this.readChunked()
		else
			return this.readWhole()
	}

	// DO NOT REMOVE!
	// Some inheriting readers need additional method for cleanup.
	// This dummy method makes sure anyone can safely call exifr.file.close() and not have to worry.
	close() {}

}
