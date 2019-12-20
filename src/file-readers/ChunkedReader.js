import {DynamicBufferView} from '../util/BufferView.js'


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
		this.allowWholeFile = options.wholeFile === true || options.wholeFile === undefined
		this.forceWholeFile = options.wholeFile === true
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
		await this.readChunk(offset, this.options.chunkSize)
	}

	get nextChunkOffset() {
		let firstRange = this.ranges[0]
		if (firstRange && firstRange.offset === 0) return firstRange.length || 0
		return 0
	}

	async read() {
		// Reading additional segments (XMP, ICC, IPTC) requires whole file to be loaded.
		// Chunked reading is only available for simple exif (APP1) FTD0.
		if (this.forceWholeFile)
			return await this.readWhole()
		try {
			// Read first chunk
			await this.readChunked()
		} catch {
			// Seeking for the exif at the beginning of the file failed.
			// Fall back to scanning throughout the whole file if allowed.
			if (this.allowWholeFile)
				return await this.readWhole()
		}
	}

	// DO NOT REMOVE!
	// Some inheriting readers need additional method for cleanup.
	// This dummy method makes sure anyone can safely call exifr.file.close() and not have to worry.
	close() {}

}
