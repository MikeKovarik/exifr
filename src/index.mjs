import {parse, findTiff} from './parser.mjs'
//import {getUint8, getUint16} from './buff-util.mjs'
import {hasBuffer, isBrowser, isNode} from './buff-util.mjs'
import {processOptions} from './options.mjs'
// Sigh... Ugly, ugly, ugly. FS Promises are experimental plus this code needs to be isomorphic
// and work without fs altogether.
import _fs from 'fs'
var fs = typeof _fs !== 'undefined' ? _fs.promises : undefined


// TODO: - minified UMD bundle
// TODO: - offer two UMD bundles (with tags.mjs dictionary and without)
// TODO: - API for including 3rd party XML parser
// TODO: - better code & file structure

export default async function(arg, options = {}) {
	options = processOptions(options)
	if (typeof arg === 'string')
		return handleString(arg, options)
	else if (isBrowser && arg instanceof HTMLImageElement)
		return handleString(arg.src, options)
	else if (hasBuffer && Buffer.isBuffer(arg))
		return handleBuffer(arg, options)
	else if (arg instanceof Uint8Array)
		return handleUint8Array(arg, options)
	else if (arg instanceof ArrayBuffer)
		return handleArrayBuffer(arg, options)
	else if (arg instanceof DataView)
		return handleBuffer(arg, options)
	else if (isBrowser && arg instanceof Blob)
		return handleBlob(arg, options)
	else
		throw new Error('Invalid input argument')
}

function handleString(url, options) {
	if (isBase64Url(url)) {
		// base64 url
		return handleBase64Url(url, options)
	} else if (isBrowser) {
		// NOTE: Object URL (blob url) is handled (fetched) the same way as normal URLs.
		return handleSimpleUrl(url, options)
	} else if (isNode) {
		// file path: Read file from drive
		return readFileFromDisk(url, options)
	} else {
		throw new Error('Invalid input argument')
	}
}

function handleUint8Array(uint8arr, options) {
	return handleArrayBuffer(uint8arr.buffer, options)
}

function handleArrayBuffer(arrayBuffer, options) {
	return handleBuffer(new DataView(arrayBuffer), options)
}

function handleBuffer(buffer, options) {
	var tiffPosition = findTiff(buffer)
	if (tiffPosition === undefined) return
	return parse(buffer, options, tiffPosition)
}



// Accepts file path and uses lower-level FS APIs to open the file, read the first 512 bytes
// trying to locate EXIF and then reading only the portion of the file where EXIF is if found.
// If the EXIF is not found within the first 512 Bytes. the range can be adjusted by user,
// or it falls back to reading the whole file if enabled with options.scanWholeFileFallback.
async function readFileFromDisk(filename, options) {
	// Reading additional segments (XMP, ICC, IPTC) requires whole file to be loaded.
	// Chunked reading is only available for simple exif (APP1) FTD0
	if (options.scanWholeFileForce) {
		var buffer = await fs.readFile(filename)
		return handleBuffer(buffer, options)
	}
	// Start by opening the file and reading the first 512 bytes.
	var fh = await fs.open(filename, 'r')
	try {
		var seekChunk = Buffer.allocUnsafe(options.seekChunkSize)
		var {bytesRead} = await fh.read(seekChunk, 0, seekChunk.length, null)
		if (!bytesRead) {
			fh.close()
			return
		}
		// Try to search for beginning of exif within the first 512 bytes.
		var tiffPosition = findTiff(seekChunk)
		if (tiffPosition !== undefined) {
			// Exif was found. Allocate appropriately sized buffer and read the whole exif into the buffer.
			// NOTE: does not load the whole file, just exif.
			var tiffChunk = Buffer.allocUnsafe(tiffPosition.size)
			await fh.read(tiffChunk, 0, tiffPosition.size, tiffPosition.start)
			return parse(tiffChunk, options, {start: 0})
		}
		// Close FD/FileHandle since we're using lower-level APIs.
		await fh.close()
	} catch(err) {
		// Try to close the FD/FileHandle in any case.
		await fh.close()
		throw err
	}
	// Seeking for the exif at the beginning of the file failed.
	// Fall back to scanning throughout the whole file if allowed.
	if (options.scanWholeFileFallback) {
		var buffer = await fs.readFile(filename)
		return handleBuffer(buffer, options)
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
async function webReader(toDataViewConverter, input, options, end) {
	var view = await toDataViewConverter(input, {end})
	var tiffPosition = findTiff(view)
	if (tiffPosition !== undefined) {
		// Exif was found.
		if (tiffPosition.end > view.byteLength) {
			// Exif was found outside the buffer we alread have.
			// We need to do additional fetch to get the whole exif at the location we found from the first chunk.
			view = await toDataViewConverter(input, tiffPosition)
			return parse(view, options, {start: 0})
		} else {
			return parse(view, options, tiffPosition)
		}
	}
	// Seeking for the exif at the beginning of the file failed.
	// Fall back to scanning throughout the whole file if allowed.
	if (options.scanWholeFileFallback) {
		view = toDataViewConverter(input)
		return handleBuffer(view, options)
	}
}

var handleBlob     = (blob, options) => webReader(convertBlobToDataView, blob, options, options.parseChunkSize)
var handleSimpleUrl = (url, options) => webReader(fetchAsDataView, url, options, options.parseChunkSize)
var handleBase64Url = (url, options) => webReader(base64ToDataView, url, options, options.seekChunkSize)




// HELPER FUNCTIONS

function isBase64Url(string) {
	return string.startsWith('data:')
		|| string.length > 10000 // naive
	//	|| string.startsWith('/9j/') // expects JPG to always start the same
}

function convertBlobToDataView(blob, {start = 0, end} = {}) {
	if (end) blob = blob.slice(start, end)
	return new Promise((resolve, reject) => {
		var reader = new FileReader()
		reader.onloadend = () => resolve(new DataView(reader.result || new ArrayBuffer(0)))
		reader.onerror = reject
		reader.readAsArrayBuffer(blob)
	})
}

async function fetchAsDataView(url, {start = 0, end} = {}) {
	var headers = {}
	if (start || end) headers.range = `bytes=${[start, end].join('-')}`
	var res = await fetch(url, {headers})
	return new DataView(await res.arrayBuffer())
}


// Accepts base64 or base64 URL and converts it to DataView and trims if needed.
function base64ToDataView(base64, position) {
	// Remove the mime type and base64 marker at the beginning so that we're left off with clear b64 string.
	base64 = base64.replace(/^data\:([^\;]+)\;base64,/gmi, '')
	if (hasBuffer) {
		// TODO: Investigate. this might not work if bundled Buffer is used in browser.
		// the slice/subarray shared memory viewed through DataView problem
		var arrayBuffer = Buffer
			.from(base64, 'base64')
			.slice(position.start, position.end)
			.buffer
	} else {
		var {start, end} = position
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
	return new DataView(arrayBuffer)
}
