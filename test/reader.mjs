import {parse} from '../index.mjs'
import {ChunkedReader, FsReader} from '../src/reader.mjs'
import {BufferView} from '../src/buff-util.mjs'
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
	console.log('createWorker', input)
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

	it(`simple file, read/fetch whole file - should succeed`, async () => {
		let options = {wholeFile: true}
		var output = await parse(getPath('IMG_20180725_163423.jpg'), options)
		console.log('output', output)
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
		var output = await parse(getPath('001.tif'), options)
		assert.equal(output.Make, 'DJI')
	})

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


	describe('BufferView', () => {

		it(`new (Uint8Array)`, async () => {
			let uint8 = new Uint8Array(3)
			uint8[2] = 5
			let view = new BufferView(uint8)
			assert.equal(view.byteLength, 3)
			assert.equal(view.getUint8(0), uint8[0])
			assert.equal(view.getUint8(1), uint8[1])
			assert.equal(view.getUint8(2), uint8[2])
			assert.equal(view.getUint8(2), 5)
		})

		isNode && it(`new (<5>, 2, 4) size outside of range should throw`, async () => {
			let uint8 = new Uint8Array(5)
			assert.throws(() => new BufferView(uint8, 2, 4))
		})

		isNode && it(`new (Buffer) allocUnsafe`, async () => {
			let buffer = Buffer.allocUnsafe(3)
			let val0 = buffer[0]
			let val1 = buffer[1]
			let val2 = buffer[2]
			let view = new BufferView(buffer)
			assert.equal(view.byteLength, 3)
			assert.equal(view.getUint8(0), val0)
			assert.equal(view.getUint8(1), val1)
			assert.equal(view.getUint8(2), val2)
		})

		isNode && it(`new (Buffer, 0, 3) allocUnsafe`, async () => {
			let buffer = Buffer.allocUnsafe(5)
			let val0 = buffer[0]
			let val1 = buffer[1]
			let val2 = buffer[2]
			let view = new BufferView(buffer, 0, 3)
			assert.equal(view.byteLength, 3)
			assert.equal(view.getUint8(0), val0)
			assert.equal(view.getUint8(1), val1)
			assert.equal(view.getUint8(2), val2)
		})

		isNode && it(`new (Buffer, 1, 3) allocUnsafe`, async () => {
			let buffer = Buffer.allocUnsafe(5)
			let val1 = buffer[1]
			let val2 = buffer[2]
			let val3 = buffer[3]
			let view = new BufferView(buffer, 1, 3)
			assert.equal(view.byteLength, 3)
			assert.equal(view.getUint8(0), val1)
			assert.equal(view.getUint8(1), val2)
			assert.equal(view.getUint8(2), val3)
		})

		isNode && it(`new (Buffer, 2, 3) allocUnsafe`, async () => {
			let buffer = Buffer.allocUnsafe(5)
			let val2 = buffer[2]
			let val3 = buffer[3]
			let val4 = buffer[4]
			let view = new BufferView(buffer, 2, 3)
			assert.equal(view.byteLength, 3)
			assert.equal(view.getUint8(0), val2)
			assert.equal(view.getUint8(1), val3)
			assert.equal(view.getUint8(2), val4)
		})

		it(`create from number`, async () => {
			let view = new BufferView(3)
			assert.equal(view.byteLength, 3)
		})

		it(`append()`, async () => {
			let firstChunk = Uint8Array.from([0,1,2])
			let view = new BufferView(firstChunk)
			assert.equal(view.byteLength, 3)
			let nextChunk = Uint8Array.from([3,4,5])
			view.append(nextChunk)
			assert.equal(view.byteLength, 6)
			assert.equal(view.getUint8(2), 2)
			assert.equal(view.getUint8(3), 3)
			assert.equal(view.getUint8(5), 5)
		})

		it(`subarray()`, async () => {
			let view = new BufferView(Uint8Array.from([0,1,2,3,4,5]))
			let subView = view.subarray(1, 4)
			assert.equal(subView.byteLength, 4)
			assert.equal(subView.getUint8(0), 1)
			assert.equal(subView.getUint8(3), 4)
		})

		isNode && it(`Node fs.read can read into sub view & changes propagate to dataview`, async () => {
			let bytesToRead = 5
			let view = new BufferView(2 * bytesToRead)
			let fistHalf = view.subarray(0, bytesToRead)
			let secondHalf = view.subarray(bytesToRead, bytesToRead)
			let fh = await fs.open(getPath('IMG_20180725_163423.jpg'), 'r')
			await fh.read(fistHalf.dataView, 0, bytesToRead, 0)
			await fh.read(secondHalf.dataView, 0, bytesToRead, bytesToRead)
			await fh.close().catch(console.error)
			assert.equal(view.getUint8(2), 0xFF)
			assert.equal(view.getUint8(4), 0x63)
			assert.equal(view.getUint8(6), 0x45)
			assert.equal(view.getUint8(8), 0x69)
		})

	})

	describe('ChunkedReader', () => {

		it(`FsReader`, async () => {
			let path = getPath('IMG_20180725_163423.jpg')
			let options = {wholeFile: false}
			let reader = new FsReader(path, options)
		})

	})


})
