import {BufferView, isBrowser, isNode, isWorker} from './util/BufferView.js'
// TODO: use these bare functions when ChunkedReader is not included in the build
import {readBlobAsArrayBuffer, fetchUrlAsArrayBuffer} from './file-readers/essentials.js'
// TODO: make optional
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
	if (fileReaders.has('blob'))
		return readUsingReader(blob, options, 'blob')
	else
		return readUsingFunction(url, options, readBlobAsArrayBuffer)
}

async function readUrl(url, options) {
	if (fileReaders.has('url'))
		return readUsingReader(url, options, 'url')
	else
		return readUsingFunction(url, options, fetchUrlAsArrayBuffer)
}

async function readBase64(base64, options) {
	return readUsingReader(base64, options, 'base64')
}

async function readFileFromDisk(filePath, options) {
	return readUsingReader(filePath, options, 'fs')
}

async function readUsingReader(input, options, readerName) {
	let Reader = fileReaders.get(readerName)
	let file = new Reader(input, options)
	await file.read()
	return file
}

async function readUsingFunction(input, options, reader) {
	let rawData = await reader(input)
	return new DataView(rawData)
}

// HELPER FUNCTIONS

function isBase64Url(string) {
	return string.startsWith('data:')
		|| string.length > 10000 // naive
	//	|| string.startsWith('/9j/') // expects JPG to always start the same
}