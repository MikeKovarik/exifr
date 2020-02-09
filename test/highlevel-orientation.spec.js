import {assert} from './test-util-core.js'
import {getFile} from './test-util-core.js'
import {Exifr} from '../src/bundle-full.js'
import * as exifr from '../src/bundle-full.js'
import {orientationOnlyOptions} from '../src/options.js'


describe('exifr.orientation()', () => {

	let input
	before(async () => input = await getFile('IMG_20180725_163423.jpg'))

	describe('output', () => {

		it('returns number', async () => {
			let orientation = await exifr.orientation(input)
			assert.equal(orientation, 1)
		})

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