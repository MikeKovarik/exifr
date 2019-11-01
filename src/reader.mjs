import {hasBuffer, isBrowser, isNode, isWorker, BufferView} from './util/BufferView.mjs'
import {processOptions} from './options.mjs'
if (isNode) {
	if (typeof require === 'function')
		var fsPromise = Promise.resolve(require('fs').promises)
	else
		var fsPromise = import(/* webpackIgnore: true */ 'fs').then(module => module.promises)
}


function findTiff() {
	throw new Error('findTiff in reader is no longer legal')
}

// TODO: - minified UMD bundle
// TODO: - offer two UMD bundles (with tags.mjs dictionary and without)
// TODO: - API for including 3rd party XML parser
// TODO: - better code & file structure
// TODO: - JFIF: it usually only has 4 props with no practical use. but for completence
// TODO: - ICC profile

export default class Reader {

	constructor(options) {
		//console.log('Reader')
		this.options = processOptions(options)
	}

	async read(arg) {
		if (typeof arg === 'string')
			return this.readString(arg)
		else if (isBrowser && !isWorker && arg instanceof HTMLImageElement)
			return this.readString(arg.src)
		else if (arg instanceof Uint8Array)
			return new BufferView(arg)
		else if (arg instanceof ArrayBuffer)
			return new BufferView(arg)
		else if (arg instanceof DataView)
			return new BufferView(arg)
		else if (isBrowser && arg instanceof Blob)
			return this.readBlob(arg)
		else
			throw new Error('Invalid input argument')
	}

	readString(string) {
		if (isBase64Url(string))
			return this.readBase64(string)
		else if (isBrowser)
			return this.readUrl(string)
		else if (isNode)
			return this.readFileFromDisk(string)
		else
			throw new Error('Invalid input argument')
	}

	async readBlob(blob) {
		this.reader = new BlobReader(blob, this.options)
		return this.reader.read(this.options.parseChunkSize)
	}

	async readUrl(url) {
		this.reader = new UrlFetcher(url, this.options)
		return this.reader.read(this.options.parseChunkSize)
	}

	async readBase64(base64) {
		this.reader = new Base64Reader(base64, this.options)
		return this.reader.read(this.options.seekChunkSize)
	}

	async readFileFromDisk(filePath) {
		this.reader = new FsReader(filePath, this.options)
		return this.reader.read()
	}

	get mode() {
		return this.reader ? 'chunked' : 'whole'
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

export class ChunkedReader {
	
	constructor(input, options) {
		//console.log('ChunkedReader')
		this.input = input
		this.options = options
	}

	async read(size) {
		//console.log('ChunkedReader.read()', size)
		// Reading additional segments (XMP, ICC, IPTC) requires whole file to be loaded.
		// Chunked reading is only available for simple exif (APP1) FTD0
		if (this.forceWholeFile) return this.readWhole()
		// Read Chunk
		let view = await this.readChunked(size)
		if (view) return view
		// Seeking for the exif at the beginning of the file failed.
		// Fall back to scanning throughout the whole file if allowed.
		if (this.allowWholeFile) return this.readWhole()
	}

	get allowWholeFile() {
		if (this.options.wholeFile === false) return false
		return this.options.wholeFile === true
			|| this.options.wholeFile === undefined
	}

	get forceWholeFile() {
		if (this.allowWholeFile === false) return false
		return this.options.wholeFile === true
			|| this.needWholeFile
	}

	get needWholeFile() {
		return !!this.options.xmp
			|| !!this.options.icc
			|| !!this.options.iptc
	}

	destroy() {}

}


export class FsReader extends ChunkedReader {

	async readWhole() {
		let fs = await fsPromise
		let buffer = await fs.readFile(this.input)
		this.view = new BufferView(buffer)
		return this.view
	}

	async readChunk({start, size}) {
		var chunk = this.view.subarray(start, size, true)
		await this.fh.read(chunk.dataView, 0, size, start)
		return chunk
	}

	async readChunked() {
		const {seekChunkSize} = this.options
		this.view = new BufferView(seekChunkSize)
		let fs = await fsPromise
		this.fh = await fs.open(this.input, 'r')
		var {bytesRead} = await this.fh.read(this.view.dataView, 0, seekChunkSize, 0)
		if (bytesRead < seekChunkSize) {
			// read less data then requested. that means we're at the end and there's no more data to read.
			return this.destroy()
		}
	}

	// TODO: auto close file handle when reading and parsing is over
	// (app can read more chunks after parsing the first)
	async destroy() {
		if (this.fh) {
			await this.fh.close().catch(console.error)
			this.fh = undefined
		}
	}

}



export class WebReader extends ChunkedReader {

	async readWhole() {
		let start = 0
		this.view = await this.readChunk({start})
		return this.view
	}

	async readChunked(size) {
		let start = 0
		let end = size
		let view = await this.readChunk({start, end, size})
	}

}

function sanitizePosition(position = {}) {
	let {start, size, end} = position
	if (start === undefined) return {start: 0}
	if (size !== undefined)
		end = start + size
	else if (end !== undefined)
		size = end - start
	return {start, size, end}

}

// TODO: make this optional. not everyone will ever use base64 inputs
export class Base64Reader extends WebReader {

	// Accepts base64 or base64 URL and converts it to DataView and trims if needed.
	readChunk(position) {
		//console.log('Base64Reader.readChunk()', position)
		let {start, end} = sanitizePosition(position)
		// Remove the mime type and base64 marker at the beginning so that we're left off with clear b64 string.
		let base64 = this.input.replace(/^data\:([^\;]+)\;base64,/gmi, '')
		if (hasBuffer) {
			// TODO: Investigate. this might not work if bundled Buffer is used in browser.
			// the slice/subarray shared memory viewed through DataView problem
			var arrayBuffer = Buffer
				.from(base64, 'base64')
				.slice(start, end)
				.buffer
		} else {
			var offset = 0
			// NOTE: Each 4 character block of base64 string represents 3 bytes of data.
			if (start !== undefined || end !== undefined) {
				if (start === undefined) {
					var blockStart = start = 0
				} else {
					var blockStart = Math.floor(start / 3) * 4
					offset = start - ((blockStart / 4) * 3)
				}
				if (end === undefined) {
					var blockEnd = base64.length
					end = (blockEnd / 4) * 3
				} else {
					var blockEnd = Math.ceil(end / 3) * 4
				}
				base64 = base64.slice(blockStart, blockEnd)
				var targetSize = end - start
			} else {
				var targetSize = (base64.length / 4) * 3
			}
			var binary = atob(base64)
			var arrayBuffer = new ArrayBuffer(targetSize)
			var uint8arr = new Uint8Array(arrayBuffer)
			for (var i = 0; i < targetSize; i++)
				uint8arr[i] = binary.charCodeAt(offset + i)
		}
		return new BufferView(arrayBuffer)
	}

}

export class UrlFetcher extends WebReader {

	async readChunk(position) {
		//console.log('UrlFetcher.readChunk()', position)
		let {start, end} = sanitizePosition(position)
		//console.log('start, end', start, end)
		let url = this.input
		let headers = {}
		if (start || end) headers.range = `bytes=${[start, end].join('-')}`
		//console.log('headers.range', headers.range)
		let res = await fetch(url, {headers})
		//console.log('res', res)
		return new BufferView(await res.arrayBuffer())
	}

}

export class BlobReader extends WebReader {

	readChunk(position) {
		//console.log('BlobReader.readChunk()', position)
		let {start, end} = sanitizePosition(position)
		let blob = this.input
		if (end) blob = blob.slice(start, end)
		return new Promise((resolve, reject) => {
			let reader = new FileReader()
			reader.onloadend = () => resolve(new BufferView(reader.result || new ArrayBuffer(0)))
			reader.onerror = reject
			reader.readAsArrayBuffer(blob)
		})
	}

}


// HELPER FUNCTIONS

function isBase64Url(string) {
	return string.startsWith('data:')
		|| string.length > 10000 // naive
	//	|| string.startsWith('/9j/') // expects JPG to always start the same
}

