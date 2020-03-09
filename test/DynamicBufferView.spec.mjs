import {assert} from './test-util-core.mjs'
import {Ranges, DynamicBufferView} from '../src/util/DynamicBufferView.mjs'


describe('DynamicBufferView', () => {
/*
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
*/
	it(`.subarray(number, number, true) extends the buffer if needed`, async () => {
		let view = new DynamicBufferView(new Uint8Array([0,1,2]))
		assert.equal(view.byteLength, 3)
		view.subarray(4, 3, true)
		assert.equal(view.byteLength, 7)
	})

	describe('.set()', () => {

		it(`extends the buffer if needed`, async () => {
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

		it(`accepts ArrayBuffer`, async () => {
			let view = new DynamicBufferView(new Uint8Array([0,1,2]))
			assert.equal(view.byteLength, 3)
			let uint8 = new Uint8Array([4,5,6])
			let arrayBuffer = uint8.buffer
			view.set(arrayBuffer, 4, true)
			assert.equal(view.byteLength, 7)
			assert.equal(view.getUint8(0), 0)
			assert.equal(view.getUint8(2), 2)
			// value at 3 is random deallocated data
			assert.equal(view.getUint8(4), 4)
			assert.equal(view.getUint8(6), 6)
		})

		it(`returns BufferView chunk of the extended view, sharing the same memory`, async () => {
			let view = new DynamicBufferView(new Uint8Array([0,1,2]))
			assert.equal(view.byteLength, 3)
			let uint8 = new Uint8Array([4,5,6])
			let arrayBuffer = uint8.buffer
			let chunk = view.set(arrayBuffer, 4, true)
			assert.equal(chunk.getUint8(0), 4)
			assert.equal(chunk.getUint8(2), 6)
			let newVal1 = 98
			let newVal2 = 99
			chunk.dataView.setUint8(0, newVal1)
			view.dataView.setUint8(5, newVal2)
			assert.equal(chunk.getUint8(0), newVal1)
			assert.equal(view.getUint8(4), newVal1)
			assert.equal(chunk.getUint8(1), newVal2)
			assert.equal(view.getUint8(5), newVal2)
		})

	})


})

describe('Ranges class', () => {

	describe('.add()', () => {

		it(`by default contains only has one range spanning input's whole size`, async () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			assert.isArray(ranges.list)
			assert.equal(ranges.list.length, 1)
			assert.equal(ranges.list[0].offset, 0)
			assert.equal(ranges.list[0].length, 5)
			assert.equal(ranges.list[0].end, 5)
		})

		it(`[0-5, 0-10] => [0-10] overlap extends existing range`, async () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			ranges.add(0, 10)
			assert.equal(ranges.list.length, 1)
			assert.equal(ranges.list[0].offset, 0)
			assert.equal(ranges.list[0].length, 10)
			assert.equal(ranges.list[0].end, 10)
		})

		it(`[0-5, 3-10] => [0-13] overlap extends existing range`, async () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			ranges.add(3, 10)
			assert.equal(ranges.list.length, 1)
			assert.equal(ranges.list[0].offset, 0)
			assert.equal(ranges.list[0].length, 13)
			assert.equal(ranges.list[0].end, 13)
		})

		it(`[0-5, 5-15] => [0-15] adjacing extends existing range`, async () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			ranges.add(5, 10)
			assert.equal(ranges.list.length, 1)
			assert.equal(ranges.list[0].offset, 0)
			assert.equal(ranges.list[0].length, 15)
			assert.equal(ranges.list[0].end, 15)
		})

		it(`[0-5, 10-20] => [0-5, 10-20] distant chunk creates new range with gap between`, async () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			ranges.add(10, 10)
			assert.equal(ranges.list.length, 2)
			assert.equal(ranges.list[0].offset, 0)
			assert.equal(ranges.list[0].length, 5)
			assert.equal(ranges.list[0].end, 5)
			assert.equal(ranges.list[1].offset, 10)
			assert.equal(ranges.list[1].length, 10)
			assert.equal(ranges.list[1].end, 20)
		})

		it(`[0-5, 10-20, 2-8] => [0-8, 10-20] overlap & distant chunk combined`, async () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			ranges.add(10, 10)
			ranges.add(2, 6)
			assert.equal(ranges.list.length, 2)
			assert.equal(ranges.list[0].offset, 0)
			assert.equal(ranges.list[0].length, 8)
			assert.equal(ranges.list[0].end, 8)
			assert.equal(ranges.list[1].offset, 10)
			assert.equal(ranges.list[1].length, 10)
			assert.equal(ranges.list[1].end, 20)
		})

		it(`[0-5, 2-8, 10-20] => [0-8, 10-20] overlap & distant chunk combined`, async () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			ranges.add(2, 6)
			ranges.add(10, 10)
			assert.equal(ranges.list.length, 2)
			assert.equal(ranges.list[0].offset, 0)
			assert.equal(ranges.list[0].length, 8)
			assert.equal(ranges.list[0].end, 8)
			assert.equal(ranges.list[1].offset, 10)
			assert.equal(ranges.list[1].length, 10)
			assert.equal(ranges.list[1].end, 20)
		})

		it(`[0-5, 5-10, 10-15] => [0-15] removing gap combines adjacent ranges`, () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			ranges.add(5, 5)
			ranges.add(10, 5)
			assert.equal(ranges.list.length, 1)
			assert.equal(ranges.list[0].offset, 0)
			assert.equal(ranges.list[0].length, 15)
			assert.equal(ranges.list[0].end, 15)
		})

		it(`[0-5, 10-15, 5-10] => [0-15] removing gap combines adjacent ranges`, () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			ranges.add(10, 5)
			ranges.add(5, 5)
			assert.equal(ranges.list.length, 1)
			assert.equal(ranges.list[0].offset, 0)
			assert.equal(ranges.list[0].length, 15)
			assert.equal(ranges.list[0].end, 15)
		})

		// TODO: add append tests

	})

	describe('.available()', () => {

		it(`[0-5] / 1-4 => true`, () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			assert.isTrue(ranges.available(1, 4))
		})

		it(`[0-5] / 0-3 => true`, () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			assert.isTrue(ranges.available(0, 3))
		})

		it(`[0-5] / 2-5 => true`, () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			assert.isTrue(ranges.available(2, 3))
		})

		it(`[0-5] / 0-5 => true`, () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			assert.isTrue(ranges.available(0, 5))
		})

		it(`[0-5] / 0-6 => false`, () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			assert.isFalse(ranges.available(0, 6))
		})

		it(`[0-5] / 4-8 => false`, () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			assert.isFalse(ranges.available(4, 4))
		})

		it(`[0-5] / 5-7 => false`, () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			assert.isFalse(ranges.available(5, 2))
		})

		it(`[0-5, 10-15] / 7-12 => false`, () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			ranges.add(10, 5)
			assert.isFalse(ranges.available(7, 5))
		})

		it(`[0-5, 5-10, 10-15] / 7-12 => true`, () => {
			let ranges = new Ranges
			ranges.add(0, 5)
			ranges.add(5, 5)
			ranges.add(10, 5)
			assert.isTrue(ranges.available(7, 5))
		})

	})

})