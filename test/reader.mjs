import {parse, Exifr} from '../index.mjs'
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

		it(`new (number) creates new view`, async () => {
			let view = new BufferView(3)
			assert.equal(view.byteLength, 3)
		})

		isNode && it(`new (Buffer.allocUnsafe) creates new view`, async () => {
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

		isNode && it(`new (Buffer.allocUnsafe, 0, 3) creates subview`, async () => {
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

		isNode && it(`new (Buffer.allocUnsafe, 1, 3) creates subview`, async () => {
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

		isNode && it(`new (Buffer.allocUnsafe, 2, 3) creates subview`, async () => {
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

		isNode && it(`trying to create subview with offset/length outside of range throw`, async () => {
			let uint8 = new Uint8Array(5)
			assert.throws(() => new BufferView(uint8, 2, 10))
		})

		it(`.subarray() creates new view on top of original memory`, async () => {
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

	describe('DynamicBufferView', () => {

		it(`.append() extends the view`, async () => {
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

		describe('.ranges array', () => {

			it(`by default contains only has one range spanning input's whole size`, async () => {
				let view = new BufferView(5)
				assert.isArray(view.ranges)
				assert.equal(view.ranges.length, 1)
				assert.equal(view.ranges[0].offset, 0)
				assert.equal(view.ranges[0].length, 5)
				assert.equal(view.ranges[0].end, 5)
			})

			it(`[0-5, 0-10] => [0-10] overlap extends existing range`, async () => {
				let view = new BufferView(5)
				view.subarray(0, 10, true)
				assert.equal(view.ranges.length, 1)
				assert.equal(view.ranges[0].offset, 0)
				assert.equal(view.ranges[0].length, 10)
				assert.equal(view.ranges[0].end, 10)
			})

			it(`[0-5, 3-10] => [0-13] overlap extends existing range`, async () => {
				let view = new BufferView(5)
				view.subarray(3, 10, true)
				assert.equal(view.ranges.length, 1)
				assert.equal(view.ranges[0].offset, 0)
				assert.equal(view.ranges[0].length, 13)
				assert.equal(view.ranges[0].end, 13)
			})

			it(`[0-5, 5-15] => [0-15] adjacing extends existing range`, async () => {
				let view = new BufferView(5)
				view.subarray(5, 10, true)
				assert.equal(view.ranges.length, 1)
				assert.equal(view.ranges[0].offset, 0)
				assert.equal(view.ranges[0].length, 15)
				assert.equal(view.ranges[0].end, 15)
			})

			it(`[0-5, 10-20] => [0-5, 10-20] distant chunk creates new range with gap between`, async () => {
				let view = new BufferView(5)
				view.subarray(10, 10, true)
				assert.equal(view.ranges.length, 2)
				assert.equal(view.ranges[0].offset, 0)
				assert.equal(view.ranges[0].length, 5)
				assert.equal(view.ranges[0].end, 5)
				assert.equal(view.ranges[1].offset, 10)
				assert.equal(view.ranges[1].length, 10)
				assert.equal(view.ranges[1].end, 20)
			})

			it(`[0-5, 10-20, 2-8] => [0-8, 10-20] overlap & distant chunk combined`, async () => {
				let view = new BufferView(5)
				view.subarray(10, 10, true)
				view.subarray(2, 6, true)
				assert.equal(view.ranges.length, 2)
				assert.equal(view.ranges[0].offset, 0)
				assert.equal(view.ranges[0].length, 8)
				assert.equal(view.ranges[0].end, 8)
				assert.equal(view.ranges[1].offset, 10)
				assert.equal(view.ranges[1].length, 10)
				assert.equal(view.ranges[1].end, 20)
			})

			it(`[0-5, 2-8, 10-20] => [0-8, 10-20] overlap & distant chunk combined`, async () => {
				let view = new BufferView(5)
				view.subarray(2, 6, true)
				view.subarray(10, 10, true)
				assert.equal(view.ranges.length, 2)
				assert.equal(view.ranges[0].offset, 0)
				assert.equal(view.ranges[0].length, 8)
				assert.equal(view.ranges[0].end, 8)
				assert.equal(view.ranges[1].offset, 10)
				assert.equal(view.ranges[1].length, 10)
				assert.equal(view.ranges[1].end, 20)
			})

			it(`[0-5, 5-10, 10-15] => [0-15] removing gap combines adjacent ranges`, () => {
				let view = new BufferView(5)
				view.subarray(5, 5, true)
				view.subarray(10, 5, true)
				assert.equal(view.ranges.length, 1)
				assert.equal(view.ranges[0].offset, 0)
				assert.equal(view.ranges[0].length, 15)
				assert.equal(view.ranges[0].end, 15)
			})

			it(`[0-5, 10-15, 5-10] => [0-15] removing gap combines adjacent ranges`, () => {
				let view = new BufferView(5)
				view.subarray(10, 5, true)
				view.subarray(5, 5, true)
				assert.equal(view.ranges.length, 1)
				assert.equal(view.ranges[0].offset, 0)
				assert.equal(view.ranges[0].length, 15)
				assert.equal(view.ranges[0].end, 15)
			})

			// TODO: add append tests

		})

		describe('.isRangeRead()', () => {

			it(`[0-5] / 1-4 => true`, () => {
				let view = new BufferView(5)
				assert.isTrue(view.isRangeRead(1, 4))
			})

			it(`[0-5] / 0-3 => true`, () => {
				let view = new BufferView(5)
				assert.isTrue(view.isRangeRead(0, 3))
			})

			it(`[0-5] / 2-5 => true`, () => {
				let view = new BufferView(5)
				assert.isTrue(view.isRangeRead(2, 3))
			})

			it(`[0-5] / 0-5 => true`, () => {
				let view = new BufferView(5)
				assert.isTrue(view.isRangeRead(0, 5))
			})

			it(`[0-5] / 0-6 => false`, () => {
				let view = new BufferView(5)
				assert.isFalse(view.isRangeRead(0, 6))
			})

			it(`[0-5] / 4-8 => false`, () => {
				let view = new BufferView(5)
				assert.isFalse(view.isRangeRead(4, 4))
			})

			it(`[0-5] / 5-7 => false`, () => {
				let view = new BufferView(5)
				assert.isFalse(view.isRangeRead(5, 2))
			})

			it(`[0-5, 10-15] / 7-12 => false`, () => {
				let view = new BufferView(5)
				view.subarray(10, 5, true)
				assert.isFalse(view.isRangeRead(7, 5))
			})

			it(`[0-5, 5-10, 10-15] / 7-12 => true`, () => {
				let view = new BufferView(5)
				view.subarray(5, 5, true)
				view.subarray(10, 5, true)
				assert.isTrue(view.isRangeRead(7, 5))
			})

		})

	})


	describe('parser', () => {
		// todo: move to another file

		it(`segments`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			console.log('input', input)
			let exifr = new Exifr(true)
			await exifr.read(input)
			exifr.findAppSegments()
			let jfifSegment = exifr.segments.find(segment => segment.type === 'jfif')
			assert.isDefined(jfifSegment)
			assert.equal(jfifSegment.offset, 25388)
			assert.equal(jfifSegment.length, 18)
			assert.equal(jfifSegment.start, 25397)
			assert.equal(jfifSegment.size, 9)
			assert.equal(jfifSegment.end, 25406)
		})

	})

	describe('ChunkedReader', () => {

		const tiffOffset = 2
		const tiffLength = 25386
		const tiffEnd    = tiffOffset + tiffLength

		const jfifOffset = 25388
		const jfifLength = 18
		const jfifEnd    = jfifOffset + jfifLength

		const seekChunkSize = 10

		let path = getPath('IMG_20180725_163423.jpg')
		let options = {wholeFile: false, seekChunkSize}

		it(`reads initial chunk`, async () => {
			let reader = new FsReader(path, {seekChunkSize})
			await reader.readChunked()
			let {view} = reader
			assert.equal(view.byteLength, seekChunkSize)
			assert.equal(view.getUint8(0), 0xFF)
			assert.equal(view.getUint8(1), 0xD8)
		})

		it(`reading additional chunks keeps extending original view`, async () => {
			let reader = new FsReader(path, options)
			await reader.readChunked()
			let tiffChunk = await reader.readChunk({
				start: tiffOffset,
				size: tiffLength
			})
			assert.equal(tiffChunk.byteLength, tiffLength)
			assert.equal(reader.view.byteLength, tiffEnd)
			let jfifChunk = await reader.readChunk({
				start: jfifOffset,
				size: jfifLength
			})
			assert.equal(jfifChunk.byteLength, jfifLength)
			assert.equal(reader.view.byteLength, jfifEnd)
		})

		it(`reading overlapping chunk does not negatively affect orignal view`, async () => {
			let reader = new FsReader(path, options)
			await reader.readChunked()
			assert.equal(reader.view.getUint8(0), 0xFF)
			assert.equal(reader.view.getUint8(1), 0xD8)
			assert.equal(reader.view.getUint8(2), 0xFF)
			assert.equal(reader.view.getUint8(3), 0xE1)
			let tiffChunk = await reader.readChunk({
				start: tiffOffset,
				size: tiffLength
			})
			assert.equal(reader.view.getUint8(0), 0xFF)
			assert.equal(reader.view.getUint8(1), 0xD8)
			assert.equal(reader.view.getUint8(2), 0xFF)
			assert.equal(reader.view.getUint8(3), 0xE1)
			assert.equal(reader.view.getUint8(13), 0x49)
			assert.equal(reader.view.getUint8(14), 0x2a)
			assert.equal(tiffChunk.getUint8(0), 0xFF)
			assert.equal(tiffChunk.getUint8(1), 0xE1)
			assert.equal(tiffChunk.getUint8(11), 0x49)
			assert.equal(tiffChunk.getUint8(12), 0x2a)
		})
/*
		it(`reading distant chunk extends original buffer but leaves`, async () => {
			let reader = new FsReader(path, options)
			await reader.readChunked()
			assert.equal(tiffChunk.byteLength, tiffLength)
			let jfifChunk = await reader.readChunk({
				start: jfifOffset,
				size: jfifLength
			})
			assert.equal(jfifChunk.byteLength, jfifLength)
			assert.equal(reader.view.byteLength, jfifEnd)
		})
*/
	})


})
