import {hasBuffer, isBrowser, isNode, isWorker, BufferView, DynamicBufferView} from './util/BufferView.js'
import createOptions from './options.js'


if (isNode) {
	if (typeof require === 'function')
		var fsPromise = Promise.resolve(require('fs').promises)
	else
		var fsPromise = import(/* webpackIgnore: true */ 'fs').then(module => module.promises)
}

// TODO: - API for including 3rd party XML parser

export default class Reader {

	constructor(options) {
		this.options = createOptions(options)
	}

	async read(arg) {
		//global.recordBenchTime(`exifr.read()`)
		if (typeof arg === 'string')
			await this.readString(arg)
		else if (isBrowser && !isWorker && arg instanceof HTMLImageElement)
			await this.readString(arg.src)
		else if (arg instanceof Uint8Array || arg instanceof ArrayBuffer || arg instanceof DataView)
			this.file = new BufferView(arg)
		else if (isBrowser && arg instanceof Blob)
			await this.readBlob(arg)
		else
			throw new Error('Invalid input argument')
	}

	async readString(string) {
		if (isBase64Url(string))
			await this.readBase64(string)
		else if (isBrowser)
			await this.readUrl(string)
		else if (isNode)
			await this.readFileFromDisk(string)
		else
			throw new Error('Invalid input argument')
	}

	async readBlob(blob) {
		this.file = new BlobReader(blob, this.options)
		await this.file.read()
	}

	async readUrl(url) {
		this.file = new UrlFetcher(url, this.options)
		await this.file.read()
	}

	async readBase64(base64) {
		this.file = new Base64Reader(base64, this.options)
		await this.file.read()
	}

	async readFileFromDisk(filePath) {
		this.file = new FsReader(filePath, this.options)
		await this.file.read()
	}

}



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

	async readWhole() {
		this.chunked = false
		await this.readChunk(this.nextGapStart)
	}

	async readChunked(size) {
		this.chunked = true
		await this.readChunk(0, this.options.firstChunkSize)
	}

	get nextGapStart() {
		let firstRange = this.ranges[0]
		if (firstRange && firstRange.start === 0) return firstRange.length || 0
		return 0
	}

	async read() {
		// Reading additional segments (XMP, ICC, IPTC) requires whole file to be loaded.
		// Chunked reading is only available for simple exif (APP1) FTD0
		if (this.forceWholeFile) return await this.readWhole()
		try {
			// Read Chunk
			await this.readChunked()
		} catch {
			// Seeking for the exif at the beginning of the file failed.
			// Fall back to scanning throughout the whole file if allowed.
			if (this.allowWholeFile) return await this.readWhole()
		}
	}

	get allowWholeFile() {
		if (this.options.wholeFile === false) return false
		return this.options.wholeFile === true
			|| this.options.wholeFile === undefined
	}

	get forceWholeFile() {
		if (this.allowWholeFile === false) return false
		return this.options.wholeFile === true
	}
/*
	get needWholeFile() {
		return !!this.options.xmp
			|| !!this.options.icc
			|| !!this.options.iptc
	}
*/
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
		if (this.fh === undefined)
			this.fh = await this.fs.open(this.input, 'r')
	}

	// todo: only read unread bytes. ignore overlaping bytes.
	async readChunk(start, size) {
		// reopen if needed
		if (this.fh === undefined) await this.open()
		// read the chunk into newly created/extended chunk of the dynamic buffer.
		var chunk = this.subarray(start, size, true)
		await this.fh.read(chunk.dataView, 0, size, start)
		return chunk
	}

	// TODO: auto close file handle when reading and parsing is over
	// (app can read more chunks after parsing the first)
	async destroy() {
		if (this.fh) {
			let fh = this.fh
			this.fh = undefined
			await fh.close()
		}
	}

}


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

	async readChunk(start, size) {
		let end = size ? start + size : undefined
		let blob = this.input.slice(start, end)
		let abChunk = await this._readBlobAsArrayBuffer(blob)
		return this.set(abChunk, start, true)
	}

}


// TODO: make this optional. not everyone will ever use base64 inputs
export class Base64Reader extends ChunkedReader {

	// Accepts base64 or base64 URL and converts it to DataView and trims if needed.
	async readChunk(start, size) {
		// Remove the mime type and base64 marker at the beginning so that we're left off with clear b64 string.
		let base64 = this.input.replace(/^data\:([^\;]+)\;base64,/gmi, '')

		let end = size ? start + size : undefined
		let offset = 0
		// NOTE: Each 4 character block of base64 string represents 3 bytes of data.
		if (start !== undefined || end !== undefined) {
			let blockStart
			if (start === undefined) {
				blockStart = start = 0
			} else {
				blockStart = Math.floor(start / 3) * 4
				offset = start - ((blockStart / 4) * 3)
			}
			let blockEnd
			if (end === undefined) {
				blockEnd = base64.length
				end = (blockEnd / 4) * 3
			} else {
				blockEnd = Math.ceil(end / 3) * 4
			}
			base64 = base64.slice(blockStart, blockEnd)
			//let targetSize = end - start
		} else {
			//let targetSize = (base64.length / 4) * 3
		}

		if (hasBuffer) {
			let slice = Buffer.from(base64, 'base64').slice(offset, size)
			return this.set(slice, start, true)
		} else {
			let chunk = this.subarray(start, size, true)
			let binary = atob(base64)
			let uint8view = chunk.getUintView()
			for (let i = 0; i < size; i++)
				uint8view[i] = binary.charCodeAt(offset + i)
			return chunk
		}
	}

}

export class UrlFetcher extends ChunkedReader {

	async readChunk(start, size) {
		let end = size ? start + size : undefined
		let url = this.input
		let headers = {}
		if (start || end) headers.range = `bytes=${[start, end].join('-')}`
		let res = await fetch(url, {headers})
		// TODO: subarray or manually create ranges record
		return new BufferView(await res.arrayBuffer())
	}

}


// HELPER FUNCTIONS

function isBase64Url(string) {
	return string.startsWith('data:')
		|| string.length > 10000 // naive
	//	|| string.startsWith('/9j/') // expects JPG to always start the same
}

