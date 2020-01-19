import * as platform from './util/platform.js'
import {BufferView} from './util/BufferView.js'
import {PluginList} from './util/helpers.js'


export var fileReaders = new PluginList('file reader')

// TODO: - API for including 3rd party XML parser

export function read(arg, options) {
	//global.recordBenchTime(`exifr.read()`)
	if (typeof arg === 'string')
		return readString(arg, options)
	else if (platform.browser && !platform.worker && arg instanceof HTMLImageElement)
		return readString(arg.src, options)
	else if (arg instanceof Uint8Array || arg instanceof ArrayBuffer || arg instanceof DataView)
		return new BufferView(arg)
	else if (platform.browser && arg instanceof Blob)
		return readBlob(arg, options)
	else
		throw new Error('Invalid input argument')
}

function readString(string, options) {
	if (isBase64Url(string))
		return readBase64(string, options)
	else if (platform.browser)
		return readUrl(string, options)
	else if (platform.node)
		return readFileFromDisk(string, options)
	else
		throw new Error('Invalid input argument')
}

async function readBlob(blob, options) {
	return useReader(blob, options, 'blob', readBlobAsArrayBuffer)
}

async function readUrl(url, options) {
	return useReader(url, options, 'url', fetchUrlAsArrayBuffer)
}

async function readBase64(base64, options) {
	return useReaderClass(base64, options, 'base64')
}

async function readFileFromDisk(filePath, options) {
	return useReaderClass(filePath, options, 'fs')
}

async function useReader(url, options, readerName, readerFn) {
	if (fileReaders.has(readerName))
		return useReaderClass(url, options, readerName)
	else
		return useReaderFunction(url, options, readerFn)
}

async function useReaderClass(input, options, readerName) {
	let Reader = fileReaders.get(readerName)
	let file = new Reader(input, options)
	await file.read()
	return file
}

async function useReaderFunction(input, options, readerFn) {
	let rawData = await readerFn(input)
	return new DataView(rawData)
}

// FALLBACK FULL-FILE READERS (when ChunkedReader and the classes aren't available)

export async function fetchUrlAsArrayBuffer(url) {
	return fetch(url).then(res => res.arrayBuffer())
}

export async function readBlobAsArrayBuffer(blob) {
	return new Promise((resolve, reject) => {
		let reader = new FileReader()
		reader.onloadend = () => resolve(reader.result || new ArrayBuffer)
		reader.onerror = reject
		reader.readAsArrayBuffer(blob)
	})
}

// HELPER FUNCTIONS

function isBase64Url(string) {
	return string.startsWith('data:')
		|| string.length > 10000 // naive
	//	|| string.startsWith('/9j/') // expects JPG to always start the same
}