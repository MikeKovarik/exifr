import {assert} from '../test-util-core.mjs'
import {getFile} from '../test-util-core.mjs'
import * as exifr from '../../src/bundles/full.mjs'


describe('WEBP - WebpFileParser', () => {

	const options = {xmp: true, tiff: true, icc: true, mergeOutput: false, translateKeys: false, translateValues: false, reviveValues: false}

	const MAKE = 271
	const MODEL = 272
	const PROFILE = 36

	it(`should extract TIFF from fixture1`, async () => {
		let input = await getFile('webp/VRChat_2023-02-19_00-04-01.274_2160x3840.webp')
		let output = await exifr.parse(input, options)
		assert.exists(output.ifd0, 'output should contain IFD0')
		assert.equal(output.ifd0[MAKE], 'logilabo')
		assert.equal(output.ifd0[MODEL], 'VirtualLens2')
	})

	it(`should extract EXIF from fixture1`, async () => {
		let input = await getFile('webp/VRChat_2023-02-19_00-04-01.274_2160x3840.webp')
		let output = await exifr.parse(input, options)
		assert.exists(output.exif, 'output should contain EXIF')
		assert.isDefined(output.exif[36867])
	})

	it(`should extract ICC from fixture2`, async () => {
		let input = await getFile('webp/VRChat_3840x2160_2022-09-04_22-48-26.551.webp')
		let output = await exifr.parse(input, options)
		assert.exists(output.icc, 'output should contain ICC')
		assert.equal(output.icc[PROFILE], 'acsp')
	})

})