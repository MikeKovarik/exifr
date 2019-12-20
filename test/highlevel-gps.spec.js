import {assert} from './test-util.js'
import {getFile, testSegment, testSegmentTranslation, testPickOrSkipTags} from './test-util.js'
import Exifr from '../src/index-full.js'
import {gpsOnlyOptions} from '../src/options.js'


// gps, thumbnail
describe('Exifr class (high level API)', () => {

	describe('Exifr.gps()', () => {

		let input
		before(async () => input = await getFile('IMG_20180725_163423.jpg'))

		describe('output', () => {

			it('returns latitue and logitude', async () => {
				let output = await Exifr.gps(input)
				assert.exists(output.latitude)
				assert.exists(output.longitude)
			})

			it('returns only {latitue, logitude}', async () => {
				let output = await Exifr.gps(input)
				assert.lengthOf(Object.keys(output), 2)
			})

		})

		describe('under the hood', () => {

			it('ifd0 only parses pointer to gps, gps only includess the necessary tags', async () => {
				let exifr = new Exifr(gpsOnlyOptions)
				await exifr.read(input)
				await exifr.parse()
				assert.isBelow(Object.keys(exifr.parsers.tiff.gps).length, 8)
				assert.lengthOf(Object.keys(exifr.parsers.tiff.ifd0), 1)
			})

			it('other blocks are not parsed at all', async () => {
				let exifr = new Exifr(gpsOnlyOptions)
				await exifr.read(input)
				await exifr.parse()
				assert.isUndefined(exifr.parsers.tiff.exif)
				assert.isUndefined(exifr.parsers.tiff.interop)
				assert.isUndefined(exifr.parsers.tiff.thumbnail)
			})

		})

	})

})