import {BufferView, isBrowser, isNode, isWorker} from './util/BufferView.js'
// TODO: use these bare functions when ChunkedReader is not included in the build
import {readBlobAsArrayBuffer, fetchUrlAsArrayBuffer} from './file-readers/essentials.js'
// TODO: make optional
import {FsReader} from './file-readers/FsReader.js'
import {Base64Reader} from './file-readers/Base64Reader.js'
import {UrlFetcher} from './file-readers/UrlFetcher.js'
import {BlobReader} from './file-readers/BlobReader.js'
export {FsReader, Base64Reader, UrlFetcher, BlobReader}
import {PluginList} from './util/helpers.js'


export var fileReaders = new PluginList('file reader')

// TODO: - API for including 3rd party XML parser

export function read(arg, options) {
	//global.recordBenchTime(`exifr.read()`)
	if (typeof arg === 'string')
		return readString(arg, options)
	else if (isBrowser && !isWorker && arg instanceof HTMLImageElement)
		return readString(arg.src, options)
	else if (arg instanceof Uint8Array || arg instanceof ArrayBuffer || arg instanceof DataView)
		return new BufferView(arg)
	else if (isBrowser && arg instanceof Blob)
		return readBlob(arg, options)
	else
		throw new Error('Invalid input argument')
}

function readString(string, options) {
	if (isBase64Url(string))
		return readBase64(string, options)
	else if (isBrowser)
		return readUrl(string, options)
	else if (isNode)
		return readFileFromDisk(string, options)
	else
		throw new Error('Invalid input argument')
}

async function readBlob(blob, options) {
	// TODO: use readBlobAsArrayBuffer() if ChunkedReader is not bundled
	let file = new BlobReader(blob, options)
	await file.read()
	return file
}

async function readUrl(url, options) {
	// TODO: use fetchUrlAsArrayBuffer() if ChunkedReader is not bundled
	let file = new UrlFetcher(url, options)
	await file.read()
	return file
}

async function readBase64(base64, options) {
	let file = new Base64Reader(base64, options)
	await file.read()
	return file
}

async function readFileFromDisk(filePath, options) {
	let file = new FsReader(filePath, options)
	await file.read()
	return file
}

// HELPER FUNCTIONS

function isBase64Url(string) {
	return string.startsWith('data:')
		|| string.length > 10000 // naive
	//	|| string.startsWith('/9j/') // expects JPG to always start the same
}