import {parse, Exifr} from '../index.mjs'
import {ChunkedReader, FsReader} from '../src/reader.mjs'
import {BufferView, DynamicBufferView} from '../src/util/BufferView.mjs'
import {assert, isBrowser, isNode} from './test-util.mjs'
import {getPath, getUrl, getFile} from './test-util.mjs'
import {promises as fs} from 'fs'


export function createImg(url) {
	var img = document.createElement('img')
	img.src = url
	document.querySelector('#temp')
		.append(img)
	return img
}

export function fetchArrayBuffer(url) {
	return fetch(url).then(res => res.arrayBuffer())
}

export async function createArrayBuffer(urlOrPath) {
	if (isBrowser)
		return fetchArrayBuffer(urlOrPath)
	else if (isNode)
		return (await fs.readFile(urlOrPath)).buffer
}

export function createBlob(url) {
	return fetch(url).then(res => res.blob())
}

export async function createObjectUrl(url) {
	return URL.createObjectURL(await createBlob(url))
}

export async function createBase64Url(url) {
	if (isBrowser) {
		return new Promise(async (resolve, reject) => {
			var blob = await createBlob(url)
			var reader = new FileReader()
			reader.onloadend = () => resolve(reader.result)
			reader.onerror = reject
			reader.readAsDataURL(blob) 
		})
	} else if (isNode) {
		var buffer = await fs.readFile(url)
		return 'data:image/jpeg;base64,' + buffer.toString('base64')
	}
}

export function createWorker(input) {
	return new Promise((resolve, reject) => {
		let worker = new Worker('worker.js')
		worker.postMessage(input)
		worker.onmessage = e => resolve(e.data)
		worker.onerror = reject
	})
}

describe('reader', () => {

	describe('input formats', () => {

		it(`ArrayBuffer`, async () => {
			var arrayBuffer = await createArrayBuffer(getPath('IMG_20180725_163423.jpg'))
			var output = await parse(arrayBuffer)
			assert.exists(output, `output is undefined`)
		})

		it(`DataView`, async () => {
			var arrayBuffer = await createArrayBuffer(getPath('IMG_20180725_163423.jpg'))
			let dataView = new DataView(arrayBuffer)
			var output = await parse(dataView)
			assert.exists(output, `output is undefined`)
		})

		it(`Uint8Array`, async () => {
			var arrayBuffer = await createArrayBuffer(getPath('IMG_20180725_163423.jpg'))
			let uint8Array = new Uint8Array(arrayBuffer)
			var output = await parse(uint8Array)
			assert.exists(output, `output is undefined`)
		})

		isNode && it(`Node: Buffer`, async () => {
			var buffer = await fs.readFile(getPath('IMG_20180725_163423.jpg'))
			var output = await parse(buffer)
			assert.exists(output, `output is undefined`)
		})

		isBrowser && it(`Browser: Blob`, async () => {
			var blob = await createBlob(getPath('IMG_20180725_163423.jpg'))
			var output = await parse(blob)
			assert.exists(output, `output is undefined`)
		})

		isNode && it(`Node: string file path`, async () => {
			let path = getPath('IMG_20180725_163423.jpg')
			var output = await parse(path)
			assert.exists(output, `output is undefined`)
		})

		isBrowser && it(`Browser: string URL`, async () => {
			let url = getUrl('IMG_20180725_163423.jpg')
			var output = await parse(url)
			assert.exists(output, `output is undefined`)
		})

		isBrowser && it(`Browser: Object URL`, async () => {
			var blob = await createObjectUrl(getPath('IMG_20180725_163423.jpg'))
			var output = await parse(blob)
			assert.exists(output, `output is undefined`)
		})

		it(`Browser & Node: base64 URL`, async () => {
			var blob = await createBase64Url(getPath('IMG_20180725_163423.jpg'))
			var output = await parse(blob)
			assert.exists(output, `output is undefined`)
		})

		isBrowser && it(`Browser: <img> element with normal URL`, async () => {
			var img = createImg(getPath('IMG_20180725_163423.jpg'))
			var output = await parse(img)
			assert.exists(output, `output is undefined`)
		})

		isBrowser && it(`Browser: <img> element with Object URL`, async () => {
			var img = createImg(await createObjectUrl(getPath('IMG_20180725_163423.jpg')))
			var output = await parse(img)
			assert.exists(output, `output is undefined`)
		})

		isBrowser && it(`WebWorker: string URL`, async () => {
			let url = getUrl('IMG_20180725_163423.jpg')
			let output = await createWorker(url)
			assert.isObject(output, `output is undefined`)
		})

		isBrowser && it(`WebWorker: ArrayBuffer`, async () => {
			let arrayBuffer = await createArrayBuffer(getPath('IMG_20180725_163423.jpg'))
			let output = await createWorker(arrayBuffer)
			assert.isObject(output, `output is undefined`)
		})

	})

	//isBrowser && it(`<img> element with base64 URL`, async () => {
	//	var img = createImg(await createBase64Url(getPath('IMG_20180725_163423.jpg')))
	//	await parse(img)
	//})



	// file with short exif where all segments are together at the
	// start of the file, within single chunk

	describe('options.wholeFile', () => {

		it(`simple file, read/fetch whole file - should succeed`, async () => {
			let options = {wholeFile: true}
			var output = await parse(getPath('IMG_20180725_163423.jpg'), options)
			assert.equal(output.Make, 'Google')
		})

		it(`simple file, chunked mode, allow additional chunks - should succeed`, async () => {
			let options = {wholeFile: undefined}
			var output = await parse(getPath('IMG_20180725_163423.jpg'), options)
			assert.equal(output.Make, 'Google')
		})

		it(`simple file, chunked mode, no additional chunks - should succeed`, async () => {
			let options = {wholeFile: false}
			var output = await parse(getPath('IMG_20180725_163423.jpg'), options)
			assert.equal(output.Make, 'Google')
		})

		// Exif is scattered throughout the file.
		// Header at the beginning of file, data at the end.
		// tiff offset at 0; ID0 offset at 677442

		it(`scattered file, read/fetch whole file - should succeed`, async () => {
			let options = {wholeFile: true}
			let input = getPath('001.tif')
			var output = await parse(input, options)
			assert.equal(output.Make, 'DJI')
		})

		it(`scattered file, chunked mode - should load & parse TIFF chunk at the end of file`, async () => {
			console.log('test me properly & move to ChunkedReader tests file')
			let options = {wholeFile: undefined}
			let input = getPath('001.tif')
			var output = await parse(input, options)
			assert.equal(output.Make, 'DJI')
		})

	})

	/*
	// TODO
	describe('file types', () => {
		it(`.jpg`, async () => {
		})
		it(`.tif`, async () => {
		})
	})
	*/

/*
TODO: rewrite chunked reader for 3.0.0
	it(`scattered file, chunked mode, allow additional chunks - should succeed`, async () => {
		let options = {wholeFile: undefined}
		var output = await parse(getPath('001.tif'), options)
		assert.equal(output.Make, 'DJI')
	})

	it(`scattered file, chunked mode, no additional chunks - should fail`, async () => {
		let options = {wholeFile: false}
		var output = await parse(getPath('001.tif'), options)
		assert.equal(exif, undefined)
	})
*/



})
