import {assert, isNode} from './test-util-core.mjs'
import {getFile} from './test-util-core.mjs'
import {Exifr} from '../src/bundles/full.mjs'
import * as exifr from '../src/bundles/full.mjs'
import {orientationOnlyOptions} from '../src/highlevel-api.mjs'


describe('exifr.orientation()', () => {

	let input
	before(async () => input = await getFile('IMG_20180725_163423.jpg'))

	describe('output', () => {

		it('returns number', async () => {
			let orientation = await exifr.orientation(input)
			assert.equal(orientation, 1)
		})

		for (let num of [1,2,3,4,5,6,7,8]) {
			it(`returns correct value regarding the image's rotation (${num})`, async () => {
				let file = await getFile(`orientation/f${num}t.jpg`)
				let orientation = await exifr.orientation(file)
				assert.equal(orientation, num)
			})
		}

	})

	describe('under the hood', () => {

		it('ifd0 only parses pointer to gps, gps only includess the necessary tags', async () => {
			let exr = new Exifr(orientationOnlyOptions)
			await exr.read(input)
			await exr.parse()
			assert.lengthOf(exr.parsers.tiff.ifd0, 1)
		})

		it('other blocks are not parsed at all', async () => {
			let exr = new Exifr(orientationOnlyOptions)
			await exr.read(input)
			await exr.parse()
			assert.isUndefined(exr.parsers.tiff.gps)
			assert.isUndefined(exr.parsers.tiff.exif)
			assert.isUndefined(exr.parsers.tiff.interop)
			assert.isUndefined(exr.parsers.tiff.thumbnail)
		})

		it('other segments are not parsed at all', async () => {
			let exr = new Exifr(orientationOnlyOptions)
			await exr.read(input)
			await exr.parse()
			assert.isUndefined(exr.parsers.icc)
			assert.isUndefined(exr.parsers.iptc)
			assert.isUndefined(exr.parsers.xmp)
			assert.isUndefined(exr.parsers.jfif)
		})

	})

})


// TODO: enable and tailor these test for ios safario (and especially 13.4 and newer) because of the autorotation quirk.
isNode && describe('exifr.rotation()', () => {

	it('returns object', async () => {
		let orientation = await exifr.rotation(await getFile('IMG_20180725_163423.jpg'))
		assert.isObject(orientation)
	})

	it(`returns correct property values regarding the image's rotation (1)`, async () => {
		let rotation = await exifr.rotation(await getFile(`orientation/f1t.jpg`))
		assert.equal(rotation.deg, 0)
		assert.equal(rotation.scaleX, 1)
		assert.equal(rotation.scaleY, 1)
	})

	it(`returns correct property values regarding the image's rotation (2)`, async () => {
		let rotation = await exifr.rotation(await getFile(`orientation/f2t.jpg`))
		assert.equal(rotation.deg, 0)
		assert.equal(rotation.scaleX, -1)
		assert.equal(rotation.scaleY, 1)
	})

	it(`returns correct property values regarding the image's rotation (3)`, async () => {
		let rotation = await exifr.rotation(await getFile(`orientation/f3t.jpg`))
		assert.equal(rotation.deg, 180)
		assert.equal(rotation.scaleX, 1)
		assert.equal(rotation.scaleY, 1)
	})

	it(`returns correct property values regarding the image's rotation (5)`, async () => {
		let rotation = await exifr.rotation(await getFile(`orientation/f5t.jpg`))
		assert.equal(rotation.deg, 90)
		assert.equal(rotation.scaleX, 1)
		assert.equal(rotation.scaleY, -1)
	})

	it(`returns correct property values regarding the image's rotation (7)`, async () => {
		let rotation = await exifr.rotation(await getFile(`orientation/f7t.jpg`))
		assert.equal(rotation.deg, 270)
		assert.equal(rotation.scaleX, 1)
		assert.equal(rotation.scaleY, -1)
	})

	it(`returns correct property values regarding the image's rotation (8)`, async () => {
		let rotation = await exifr.rotation(await getFile(`orientation/f8t.jpg`))
		assert.equal(rotation.deg, 270)
		assert.equal(rotation.scaleX, 1)
		assert.equal(rotation.scaleY, 1)
	})

})