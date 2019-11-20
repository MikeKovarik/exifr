import {promises as fs} from 'fs'
import {assert} from './test-util.js'
import {isBrowser, isNode, getPath, getUrl, getFile} from './test-util.js'
import {DynamicBufferView} from '../src/util/BufferView.js'
import {ChunkedReader, FsReader} from '../src/reader.js'


describe('DynamicBufferView', () => {

	it(`.append() extends the view`, async () => {
		let view = new DynamicBufferView(new Uint8Array([0,1,2]))
		assert.equal(view.byteLength, 3)
		let nextChunk = Uint8Array.from([3,4,5])
		view.append(nextChunk)
		assert.equal(view.byteLength, 6)
		assert.equal(view.getUint8(2), 2)
		assert.equal(view.getUint8(3), 3)
		assert.equal(view.getUint8(5), 5)
	})

	it(`.subarray(number, number, true) extends the buffer if needed`, async () => {
		let view = new DynamicBufferView(new Uint8Array([0,1,2]))
		assert.equal(view.byteLength, 3)
		view.subarray(4, 3, true)
		assert.equal(view.byteLength, 7)
	})

	it(`.set(input, number, true) extends the buffer if needed`, async () => {
		let view = new DynamicBufferView(new Uint8Array([0,1,2]))
		assert.equal(view.byteLength, 3)
		view.set(new Uint8Array([4,5,6]), 4, true)
		assert.equal(view.byteLength, 7)
		assert.equal(view.getUint8(0), 0)
		assert.equal(view.getUint8(2), 2)
		// value at 3 is random deallocated data
		assert.equal(view.getUint8(4), 4)
		assert.equal(view.getUint8(6), 6)
	})

	describe('.ranges array', () => {

		it(`by default contains only has one range spanning input's whole size`, async () => {
			let view = new DynamicBufferView(5)
			assert.isArray(view.ranges)
			assert.equal(view.ranges.length, 1)
			assert.equal(view.ranges[0].offset, 0)
			assert.equal(view.ranges[0].length, 5)
			assert.equal(view.ranges[0].end, 5)
		})

		it(`[0-5, 0-10] => [0-10] overlap extends existing range`, async () => {
			let view = new DynamicBufferView(5)
			view.subarray(0, 10, true)
			assert.equal(view.ranges.length, 1)
			assert.equal(view.ranges[0].offset, 0)
			assert.equal(view.ranges[0].length, 10)
			assert.equal(view.ranges[0].end, 10)
		})

		it(`[0-5, 3-10] => [0-13] overlap extends existing range`, async () => {
			let view = new DynamicBufferView(5)
			view.subarray(3, 10, true)
			assert.equal(view.ranges.length, 1)
			assert.equal(view.ranges[0].offset, 0)
			assert.equal(view.ranges[0].length, 13)
			assert.equal(view.ranges[0].end, 13)
		})

		it(`[0-5, 5-15] => [0-15] adjacing extends existing range`, async () => {
			let view = new DynamicBufferView(5)
			view.subarray(5, 10, true)
			assert.equal(view.ranges.length, 1)
			assert.equal(view.ranges[0].offset, 0)
			assert.equal(view.ranges[0].length, 15)
			assert.equal(view.ranges[0].end, 15)
		})

		it(`[0-5, 10-20] => [0-5, 10-20] distant chunk creates new range with gap between`, async () => {
			let view = new DynamicBufferView(5)
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
			let view = new DynamicBufferView(5)
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
			let view = new DynamicBufferView(5)
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
			let view = new DynamicBufferView(5)
			view.subarray(5, 5, true)
			view.subarray(10, 5, true)
			assert.equal(view.ranges.length, 1)
			assert.equal(view.ranges[0].offset, 0)
			assert.equal(view.ranges[0].length, 15)
			assert.equal(view.ranges[0].end, 15)
		})

		it(`[0-5, 10-15, 5-10] => [0-15] removing gap combines adjacent ranges`, () => {
			let view = new DynamicBufferView(5)
			view.subarray(10, 5, true)
			view.subarray(5, 5, true)
			assert.equal(view.ranges.length, 1)
			assert.equal(view.ranges[0].offset, 0)
			assert.equal(view.ranges[0].length, 15)
			assert.equal(view.ranges[0].end, 15)
		})

		// TODO: add append tests

	})

	describe('.isRangeAvailable()', () => {

		it(`[0-5] / 1-4 => true`, () => {
			let view = new DynamicBufferView(5)
			assert.isTrue(view.isRangeAvailable(1, 4))
		})

		it(`[0-5] / 0-3 => true`, () => {
			let view = new DynamicBufferView(5)
			assert.isTrue(view.isRangeAvailable(0, 3))
		})

		it(`[0-5] / 2-5 => true`, () => {
			let view = new DynamicBufferView(5)
			assert.isTrue(view.isRangeAvailable(2, 3))
		})

		it(`[0-5] / 0-5 => true`, () => {
			let view = new DynamicBufferView(5)
			assert.isTrue(view.isRangeAvailable(0, 5))
		})

		it(`[0-5] / 0-6 => false`, () => {
			let view = new DynamicBufferView(5)
			assert.isFalse(view.isRangeAvailable(0, 6))
		})

		it(`[0-5] / 4-8 => false`, () => {
			let view = new DynamicBufferView(5)
			assert.isFalse(view.isRangeAvailable(4, 4))
		})

		it(`[0-5] / 5-7 => false`, () => {
			let view = new DynamicBufferView(5)
			assert.isFalse(view.isRangeAvailable(5, 2))
		})

		it(`[0-5, 10-15] / 7-12 => false`, () => {
			let view = new DynamicBufferView(5)
			view.subarray(10, 5, true)
			assert.isFalse(view.isRangeAvailable(7, 5))
		})

		it(`[0-5, 5-10, 10-15] / 7-12 => true`, () => {
			let view = new DynamicBufferView(5)
			view.subarray(5, 5, true)
			view.subarray(10, 5, true)
			assert.isTrue(view.isRangeAvailable(7, 5))
		})

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

	describe('FsReader', () => {

		let path = getPath('IMG_20180725_163423.jpg')
		let options = {wholeFile: false, seekChunkSize}

		it(`reads initial chunk`, async () => {
			let view = new FsReader(path, {seekChunkSize})
			await view.readChunked()
			assert.equal(view.byteLength, seekChunkSize)
			assert.equal(view.getUint8(0), 0xFF)
			assert.equal(view.getUint8(1), 0xD8)
		})

		it(`reading additional chunks keeps extending original view`, async () => {
			let view = new FsReader(path, options)
			console.log('view.byteLength', view.byteLength)
			await view.readChunked()
			console.log('view.byteLength', view.byteLength)
			let tiffChunk = await view.readChunk(tiffOffset, tiffLength)
			assert.equal(tiffChunk.byteLength, tiffLength)
			assert.equal(view.byteLength, tiffEnd)
			console.log('view.byteLength', view.byteLength)
			let jfifChunk = await view.readChunk(jfifOffset, jfifLength)
			assert.equal(jfifChunk.byteLength, jfifLength)
			assert.equal(view.byteLength, jfifEnd)
			console.log('view.byteLength', view.byteLength)
		})

		it(`reading overlapping chunk does not negatively affect orignal view`, async () => {
			let view = new FsReader(path, options)
			await view.readChunked()
			assert.equal(view.getUint8(0), 0xFF)
			assert.equal(view.getUint8(1), 0xD8)
			assert.equal(view.getUint8(2), 0xFF)
			assert.equal(view.getUint8(3), 0xE1)
			let tiffChunk = await view.readChunk(tiffOffset, tiffLength)
			assert.equal(view.getUint8(0), 0xFF)
			assert.equal(view.getUint8(1), 0xD8)
			assert.equal(view.getUint8(2), 0xFF)
			assert.equal(view.getUint8(3), 0xE1)
			assert.equal(view.getUint8(13), 0x49)
			assert.equal(view.getUint8(14), 0x2a)
			assert.equal(tiffChunk.getUint8(0), 0xFF)
			assert.equal(tiffChunk.getUint8(1), 0xE1)
			assert.equal(tiffChunk.getUint8(11), 0x49)
			assert.equal(tiffChunk.getUint8(12), 0x2a)
		})
	/*
		it(`reading distant chunk extends original buffer but leaves`, async () => {
			let view = new FsReader(path, options)
			await view.readChunked()
			assert.equal(tiffChunk.byteLength, tiffLength)
			let jfifChunk = await view.readChunk(jfifOffset, jfifLength)
			assert.equal(jfifChunk.byteLength, jfifLength)
			assert.equal(view.byteLength, jfifEnd)
		})
	*/


		const ifd0Pointer = 8
		const exifPointer = 239
		const gpsPointer = 18478

		it(`small chunk`, async () => {
			let options = {wholeFile: false, seekChunkSize}
			let view = new FsReader(path, options)
			await view.readChunked()
			assert.equal(true, false)
		})


	})

})
