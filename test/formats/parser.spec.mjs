import {assert} from '../test-util-core.mjs'
import {isBrowser, isNode, getPath, getFile} from '../test-util-core.mjs'
import {Exifr} from '../../src/bundles/full.mjs'
import * as exifr from '../../src/bundles/full.mjs'


describe('parser core', () => {

	describe(`throws if the input file isn't supported`, () => {

		it(`rejects random file 1`, async () => {
			let input = await getFile('icc/D65_XYZ.icc')
			try {
				await exifr.parse(input)
			} catch(err) {
				assert.instanceOf(err, Error)
				assert.equal(err.message, 'Unknown file format')
			}
		})

		it(`rejects random file 2`, async () => {
			let input = await getFile('cookiezen.xmp')
			try {
				await exifr.parse(input)
			} catch(err) {
				assert.instanceOf(err, Error)
				assert.equal(err.message, 'Unknown file format')
			}
		})

		it(`accepts JPEG`, async () => {
			await exifr.parse(await getFile('img_1771.jpg'))
		})

		it(`accepts TIFF`, async () => {
			await exifr.parse(await getFile('issue-exif-js-124.tiff'))
		})

		it(`accepts HEIC`, async () => {
			await exifr.parse(await getFile('heic-empty.heic'))
		})

		it(`accepts PNG`, async () => {
			await exifr.parse(await getFile('png/IMG_20180725_163423-1.png'))
		})

		it(`accepts AVIF`, async () => {
			await exifr.parse(await getFile('avif/Irvine_CA.avif'))
		})

	})

})