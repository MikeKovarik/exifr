import {assert} from '../test-util-core.mjs'
import {getFile} from '../test-util-core.mjs'
import * as exifr from '../../src/bundles/full.mjs'


// TODO
describe('AVIF - AvifFileParser', () => {

	const options = {tiff: true, icc: true, xmp: true, mergeOutput: false, translateKeys: false, translateValues: false, reviveValues: false}

	const MAKE = 271
	const MODEL = 272
	const PROFILE = 36

	it(`should extract TIFF from fixture1`, async () => {
		let input = await getFile('avif/Irvine_CA.avif')
		let output = await exifr.parse(input, options)
		assert.exists(output.ifd0, 'output should contain IFD0')
		assert.equal(output.ifd0[MAKE], 'Apple')
		assert.equal(output.ifd0[MODEL], 'iPhone 3GS')
	})

	it(`should extract EXIF from fixture1`, async () => {
		let input = await getFile('avif/Irvine_CA.avif')
		let output = await exifr.parse(input, options)
		assert.exists(output.exif, 'output should contain EXIF')
		assert.isDefined(output.exif[36867])
	})

	it(`should extract ICC from fixture2`, async () => {
		let input = await getFile('avif/IMG_20180725_163423-micro.avif')
		let output = await exifr.parse(input, options)
		assert.exists(output.icc, 'output should contain ICC')
		assert.equal(output.icc[PROFILE], 'acsp')
	})

	it(`should extract XMP from fixture3`, async () => {
		let input = await getFile('avif/IMG_20180725_163423-2.avif')
		let output = await exifr.parse(input, options)
		assert.exists(output.xmp, 'output should contain XMP')
		assert.equal(output.xmp.CreatorTool, 'HDR+ 1.0.199571065z')
	})

})