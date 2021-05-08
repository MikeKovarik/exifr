import * as platform from './util/platform.mjs'
import {BufferView} from './util/BufferView.mjs'
import {throwError} from './util/helpers.mjs'
import {fileReaders} from './plugins.mjs'
import {fetch} from './polyfill/fetch.mjs'


// TODO: - API for including 3rd party XML parser

const INVALID_INPUT = 'Invalid input argument'

export function read(arg, options) {
	if (typeof arg === 'string')
		return readString(arg, options)
	else if (platform.browser && !platform.worker && arg instanceof HTMLImageElement)
		return readString(arg.src, options)
	else if (arg instanceof Uint8Array || arg instanceof ArrayBuffer || arg instanceof DataView)
		return new BufferView(arg)
	else if (platform.browser && arg instanceof Blob)
		return callReader(arg, options, 'blob', readBlobAsArrayBuffer)
	else
		throwError(INVALID_INPUT)
}

function readString(arg, options) {
	if (isBase64Url(arg))
		return callReaderClass(arg, options, 'base64')
	else if (platform.node && arg.includes('://')) // fs.read takes precedence over fetch but node can now fetch as well. This needs to be before fs.
		return callReader(arg, options, 'url', fetchUrlAsArrayBuffer)
	else if (platform.node) // Keep node before browser platform check due to electron/nwjs where node's fs should take priority over fetch and file:///
		return callReaderClass(arg, options, 'fs')
	else if (platform.browser) // All other string here are just urls and we can safely fetch them
		return callReader(arg, options, 'url', fetchUrlAsArrayBuffer)
	else
		throwError(INVALID_INPUT)
}

async function callReader(url, options, readerName, readerFn) {
	if (fileReaders.has(readerName))
		return callReaderClass(url, options, readerName)
	else if (readerFn)
		return callReaderFunction(url, readerFn)
	else
		throwError(`Parser ${readerName} is not loaded`)
}

async function callReaderClass(input, options, readerName) {
	let Reader = fileReaders.get(readerName)
	let file = new Reader(input, options)
	await file.read()
	return file
}

async function callReaderFunction(input, readerFn) {
	let rawData = await readerFn(input)
	return new BufferView(rawData)
}

// FALLBACK FULL-FILE READERS (when ChunkedReader and the classes aren't available)

export const fetchUrlAsArrayBuffer = url => fetch(url).then(res => res.arrayBuffer())

export const readBlobAsArrayBuffer = blob => new Promise((resolve, reject) => {
	let reader = new FileReader()
	reader.onloadend = () => resolve(reader.result || new ArrayBuffer)
	reader.onerror = reject
	reader.readAsArrayBuffer(blob)
})

// HELPER FUNCTIONS

function isBase64Url(string) {
	return string.startsWith('data:')
		|| string.length > 10000 // naive
}