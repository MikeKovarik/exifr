import {promises as fs} from 'fs'
import {assert} from './test-util-core.mjs'
import {isNode, getPath} from './test-util-core.mjs'
import {BufferView} from '../src/util/BufferView.mjs'


// Node.js tries to share memory of newly created Buffer instances in shared large ArrayBuffer.
// This function creates new blank slate.
function createIsolatedArrayBuffer(...bytes) {
	let arrayBuffer = new ArrayBuffer(bytes.length)
	let buffer = new Uint8Array(arrayBuffer)
	for (let i = 0; i < bytes.length; i++)
		buffer[i] = bytes[i]
	return buffer.buffer
}

function createIsolatedDataView(...bytes) {
	let arrayBuffer = createIsolatedArrayBuffer(...bytes)
	return new DataView(arrayBuffer)
}

describe('BufferView', () => {

	describe('constructor new BufferView', () => {

		describe(`number`, async () => {

			it(`(number) creates new view`, async () => {
				let view = new BufferView(3)
				assert.equal(view.byteLength, 3)
			})

			it(`(number) creates new view`, async () => {
				let view = new BufferView(3)
				assert.equal(view.byteLength, 3)
			})

		})

		describe(`Uint8Array`, async () => {

			it(`(Uint8Array)`, async () => {
				let uint8 = Uint8Array.of(0, 1, 2, 3, 4)
				let view = new BufferView(uint8)
				assert.equal(view.byteLength, 5)
				assert.equal(view.getUint8(0), uint8[0])
				assert.equal(view.getUint8(1), uint8[1])
				assert.equal(view.getUint8(2), uint8[2])
				assert.equal(view.getUint8(3), uint8[3])
				assert.equal(view.getUint8(4), uint8[4])
			})

			it(`(Uint8Array, 0, 3) creates subview`, async () => {
				let uint8 = Uint8Array.of(0, 1, 2, 3, 4)
				let view = new BufferView(uint8, 0, 3)
				assert.equal(view.byteLength, 3)
				assert.equal(view.getUint8(0), 0)
				assert.equal(view.getUint8(1), 1)
				assert.equal(view.getUint8(2), 2)
			})

			it(`(Uint8Array, 1, 3) creates subview`, async () => {
				let uint8 = Uint8Array.of(0, 1, 2, 3, 4)
				let view = new BufferView(uint8, 1, 3)
				assert.equal(view.byteLength, 3)
				assert.equal(view.getUint8(0), 1)
				assert.equal(view.getUint8(1), 2)
				assert.equal(view.getUint8(2), 3)
			})

			it(`(Uint8Array, 2, 3) creates subview`, async () => {
				let uint8 = Uint8Array.of(0, 1, 2, 3, 4)
				let view = new BufferView(uint8, 2, 3)
				assert.equal(view.byteLength, 3)
				assert.equal(view.getUint8(0), 2)
				assert.equal(view.getUint8(1), 3)
				assert.equal(view.getUint8(2), 4)
			})

			it(`(Uint8Array, 3, 3) throws out of range`, async () => {
				let uint8 = Uint8Array.of(0, 1, 2, 3, 4)
				assert.throws(() => new BufferView(uint8, 3, 3))
			})

			it(`(Uint8Array, 3) creates subview from middle to end`, async () => {
				let uint8 = Uint8Array.of(0, 1, 2, 3, 4)
				let view = new BufferView(uint8, 3)
				assert.equal(view.byteLength, 2)
				assert.equal(view.getUint8(0), 3)
				assert.equal(view.getUint8(1), 4)
			})

		})

		describe(`ArrayBuffer`, async () => {

			it(`(ArrayBuffer) creates new view`, async () => {
				let arrayBuffer = createIsolatedArrayBuffer(0, 1, 2, 3, 4)
				let view = new BufferView(arrayBuffer)
				assert.equal(view.byteLength, 5)
			})

			it(`(ArrayBuffer, 0, 3) creates subview`, async () => {
				let arrayBuffer = createIsolatedArrayBuffer(0, 1, 2, 3, 4)
				let view = new BufferView(arrayBuffer, 0, 3)
				assert.equal(view.byteLength, 3)
				assert.equal(view.getUint8(0), 0)
				assert.equal(view.getUint8(1), 1)
				assert.equal(view.getUint8(2), 2)
			})

			it(`(ArrayBuffer, 1, 3) creates subview`, async () => {
				let arrayBuffer = createIsolatedArrayBuffer(0, 1, 2, 3, 4)
				let view = new BufferView(arrayBuffer, 1, 3)
				assert.equal(view.byteLength, 3)
				assert.equal(view.getUint8(0), 1)
				assert.equal(view.getUint8(1), 2)
				assert.equal(view.getUint8(2), 3)
			})

			it(`(ArrayBuffer, 2, 3) creates subview`, async () => {
				let arrayBuffer = createIsolatedArrayBuffer(0, 1, 2, 3, 4)
				let view = new BufferView(arrayBuffer, 2, 3)
				assert.equal(view.byteLength, 3)
				assert.equal(view.getUint8(0), 2)
				assert.equal(view.getUint8(1), 3)
				assert.equal(view.getUint8(2), 4)
			})

			it(`(ArrayBuffer, 3, 3) throws out of range`, async () => {
				let arrayBuffer = createIsolatedArrayBuffer(0, 1, 2, 3, 4)
				assert.throws(() => new BufferView(arrayBuffer, 3, 3))
			})

			it(`(ArrayBuffer, 3) creates subview from middle to end`, async () => {
				let arrayBuffer = createIsolatedArrayBuffer(0, 1, 2, 3, 4)
				let view = new BufferView(arrayBuffer, 3)
				assert.equal(view.byteLength, 2)
				assert.equal(view.getUint8(0), 3)
				assert.equal(view.getUint8(1), 4)
			})

		})

		describe(`DataView`, async () => {

			it(`(DataView) creates new view`, async () => {
				let dataView = createIsolatedDataView(0, 1, 2, 3, 4)
				let view = new BufferView(dataView)
				assert.equal(view.byteLength, 5)
			})

			it(`(DataView, 0, 3) creates subview`, async () => {
				let dataView = createIsolatedDataView(0, 1, 2, 3, 4)
				let view = new BufferView(dataView, 0, 3)
				assert.equal(view.byteLength, 3)
				assert.equal(view.getUint8(0), 0)
				assert.equal(view.getUint8(1), 1)
				assert.equal(view.getUint8(2), 2)
			})

			it(`(DataView, 1, 3) creates subview`, async () => {
				let dataView = createIsolatedDataView(0, 1, 2, 3, 4)
				let view = new BufferView(dataView, 1, 3)
				assert.equal(view.byteLength, 3)
				assert.equal(view.getUint8(0), 1)
				assert.equal(view.getUint8(1), 2)
				assert.equal(view.getUint8(2), 3)
			})

			it(`(DataView, 2, 3) creates subview`, async () => {
				let dataView = createIsolatedDataView(0, 1, 2, 3, 4)
				let view = new BufferView(dataView, 2, 3)
				assert.equal(view.byteLength, 3)
				assert.equal(view.getUint8(0), 2)
				assert.equal(view.getUint8(1), 3)
				assert.equal(view.getUint8(2), 4)
			})

			it(`(DataView, 3, 3) throws out of range`, async () => {
				let dataView = createIsolatedDataView(0, 1, 2, 3, 4)
				assert.throws(() => new BufferView(dataView, 3, 3))
			})

			it(`(DataView, 3) creates subview from middle to end`, async () => {
				let arrayBuffer = createIsolatedDataView(0, 1, 2, 3, 4)
				let view = new BufferView(arrayBuffer, 3)
				assert.equal(view.byteLength, 2)
				assert.equal(view.getUint8(0), 3)
				assert.equal(view.getUint8(1), 4)
			})

		})

		isNode && describe(`Buffer`, async () => {

			it(`(Buffer.allocUnsafe) creates new view`, async () => {
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

			it(`(Buffer.allocUnsafe, 0, 3) creates subview`, async () => {
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

			it(`(Buffer.allocUnsafe, 1, 3) creates subview`, async () => {
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

			it(`(Buffer.allocUnsafe, 2, 3) creates subview`, async () => {
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

			it(`(Buffer.allocUnsafe, 3, 3) throws out of range`, async () => {
				let buffer = Buffer.allocUnsafe(5)
				assert.throws(() => new BufferView(buffer, 3, 3))
			})

		})

	})

	isNode && it(`trying to create subview with offset/length outside of range throws`, async () => {
		let uint8 = new Uint8Array(5)
		assert.throws(() => new BufferView(uint8, 2, 10))
	})

	describe(`.subarray()`, () => {

		it(`.subarray() returns instance of BufferView even if subclassed`, async () => {
			class DerivedView extends BufferView {}
			let view = new DerivedView(Uint8Array.from([0,1,2,3,4,5]))
			let subView = view.subarray(1, 4)
			assert.instanceOf(subView, BufferView)
		})

		it(`.subarray(offset, length) creates new view on top of original memory at given offset and length`, async () => {
			let view = new BufferView(Uint8Array.from([0,1,2,3,4,5]))
			let subView = view.subarray(1, 4)
			assert.equal(subView.byteLength, 4)
			assert.equal(subView.getUint8(0), 1)
			assert.equal(subView.getUint8(3), 4)
		})

		it(`.subarray(offset) creates new view on top of original memory from given offset until end`, async () => {
			let view = new BufferView(Uint8Array.from([0,1,2,3,4,5]))
			let subView = view.subarray(3)
			assert.equal(subView.byteLength, 3)
			assert.equal(subView.getUint8(0), 3)
			assert.equal(subView.getUint8(1), 4)
			assert.equal(subView.getUint8(2), 5)
		})

	})

	describe(`.getUint8Array()`, () => {

		it(`.getUint8Array() returns instance of BufferView even if subclassed`, async () => {
			let view = new BufferView(Uint8Array.from([0,1,2,3,4,5]))
			let chunk = view.getUint8Array(1, 4)
			assert.instanceOf(chunk, Uint8Array)
		})

		it(`.getUint8Array(offset, length) creates new view on top of original memory at given offset and length`, async () => {
			let view = new BufferView(Uint8Array.from([0,1,2,3,4,5]))
			let chunk = view.getUint8Array(1, 4)
			assert.equal(chunk.byteLength, 4)
			assert.deepEqual(Array.from(chunk), [1,2,3,4])
		})

		it(`.getUint8Array() has no sideeffects`, async () => {
			let view = new BufferView(Uint8Array.from([0,1,2,3,4,5]))
			view.getUint8Array(1, 4)
			assert.equal(view.byteLength, 6)
			assert.deepEqual(Array.from(new Uint8Array(view.buffer)), [0,1,2,3,4,5])
		})

		it(`.getUint8Array() chunk shares memory with parent`, async () => {
			let view = new BufferView(Uint8Array.from([0,1,2,3,4,5]))
			let chunk = view.getUint8Array(1, 4)
			chunk[1] = 98
			chunk[3] = 99
			assert.deepEqual(Array.from(chunk), [1,98,3,99])
			assert.deepEqual(Array.from(new Uint8Array(view.buffer)), [0,1,98,3,99,5])
		})

	})

	it(`.set() inserts DataView at given offset`, async () => {
		let uintView = new Uint8Array([7,8,9])
		let dataView = new DataView(uintView.buffer, uintView.byteOffset, uintView.byteLength)
		let view     = new BufferView(new Uint8Array([0,1,2,3,4,5]))
		view.set(dataView, 2)
		assert.equal(view.getUint8(0), 0)
		assert.equal(view.getUint8(1), 1)
		assert.equal(view.getUint8(2), 7)
		assert.equal(view.getUint8(3), 8)
		assert.equal(view.getUint8(4), 9)
		assert.equal(view.getUint8(5), 5)
	})

	isNode && it(`Node fs.read can read into sub view & changes propagate to dataview`, async () => {
		let bytesToRead = 5
		let view = new BufferView(2 * bytesToRead)
		let fistHalf = view.subarray(0, bytesToRead)
		let secondHalf = view.subarray(bytesToRead, bytesToRead)
		let fh = await fs.open(getPath('IMG_20180725_163423.jpg'), 'r')
		await fh.read(fistHalf.dataView, 0, bytesToRead, 0)
		await fh.read(secondHalf.dataView, 0, bytesToRead, bytesToRead)
		await fh.close()
		assert.equal(view.getUint8(2), 0xFF)
		assert.equal(view.getUint8(4), 0x63)
		assert.equal(view.getUint8(6), 0x45)
		assert.equal(view.getUint8(8), 0x69)
	})

})