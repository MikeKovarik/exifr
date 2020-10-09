import {assert} from './test-util-core.mjs'
import {isBrowser, isNode, getPath, getFile} from './test-util-core.mjs'
import {Exifr} from '../src/bundles/full.mjs'
import * as exifr from '../src/bundles/full.mjs'


describe('parser core', () => {

	describe(`throws if the input file isn't supported`, () => {

		it(`rejects random file 1`, async () => {
			let input = await getFile('D65_XYZ.icc')
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

	})

})

describe('JPEG - JpegFileParser', () => {

	describe('.findAppSegments()', () => {

		it(`finds APP segments existing in jpg file`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let exr = new Exifr({tiff: true, xmp: true, jfif: true})
			await exr.read(input)
			exr.setup()
			let jpegFileParser = exr.fileParser
			jpegFileParser.findAppSegments()
			let jfifSegment = jpegFileParser.appSegments.find(segment => segment.type === 'jfif')
			assert.isDefined(jfifSegment)
			assert.equal(jfifSegment.offset, 25388)
			assert.equal(jfifSegment.length, 18)
			assert.equal(jfifSegment.start, 25397)
			assert.equal(jfifSegment.size, 9)
			assert.equal(jfifSegment.end, 25406)
			let tiffSegment = jpegFileParser.appSegments.find(segment => segment.type === 'tiff')
			assert.isDefined(tiffSegment)
		})

		it(`doesn't find segment not present in jpg file`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let exr = new Exifr({tiff: true, xmp: true, jfif: true})
			await exr.read(input)
			exr.setup()
			let jpegFileParser = exr.fileParser
			jpegFileParser.findAppSegments()
			let xmpSegment = jpegFileParser.appSegments.find(segment => segment.type === 'xmp')
			assert.isUndefined(xmpSegment)
		})

		it(`multisegment ICC - finds all segments`, async () => {
			let input = await getFile('issue-metadata-extractor-65.jpg')
			let exr = new Exifr(true)
			await exr.read(input)
			exr.setup()
			let jpegFileParser = exr.fileParser
			jpegFileParser.findAppSegments()
			let iccSegments = jpegFileParser.appSegments.filter(segment => segment.type === 'icc')
			assert.lengthOf(iccSegments, 9)
		})

	})

})
/*
describe('TIFF - TiffFileParser', () => {
})
*/

describe('HEIC - HeicFileParser', () => {

	const options = {tiff: true, icc: true, mergeOutput: false, translateKeys: false, translateValues: false, reviveValues: false}

	const MAKE = 271
	const MODEL = 272

	it(`should not find anything in fixture1`, async () => {
		let input = await getFile('heic-single.heic')
		let output = await exifr.parse(input, options)
		assert.isUndefined(output, 'output should be undefined')
	})

	it(`should not find anything in fixture2`, async () => {
		let input = await getFile('heic-collection.heic')
		let output = await exifr.parse(input, options)
		assert.isUndefined(output, 'output should be undefined')
	})

	it(`should extract TIFF & ICC from fixture3`, async () => {
		let input = await getFile('heic-empty.heic')
		let output = await exifr.parse(input, options)
		assert.exists(output.ifd0, 'output should contain IFD0')
		assert.exists(output.icc, 'output should contain ICC')
		assert.equal(output.icc[16], 'RGB') // ColorSpaceData
	})

	it(`should extract TIFF & ICC from fixture4`, async () => {
		let input = await getFile('heic-iphone.heic')
		let output = await exifr.parse(input, options)
		assert.exists(output.ifd0, 'output should contain IFD0')
		assert.exists(output.exif, 'output should contain EXIF')
		assert.exists(output.gps,  'output should contain GPS')
		assert.exists(output.icc,  'output should contain ICC')
		assert.equal(output.ifd0[MAKE], 'Apple')
		assert.equal(output.ifd0[MODEL], 'iPhone XS Max')
	})

	it(`should extract TIFF & ICC from fixture5`, async () => {
		let input = await getFile('heic-iphone7.heic')
		let output = await exifr.parse(input, options)
		assert.exists(output.ifd0, 'output should contain IFD0')
		assert.exists(output.exif, 'output should contain EXIF')
		assert.exists(output.gps,  'output should contain GPS')
		assert.exists(output.icc,  'output should contain ICC')
	})

	it(`address of TIFF/EXIF from HEIC should align properly`, async () => {
		let input = await getFile('heic-iphone7.heic')
		let output = await exifr.parse(input, options)
		assert.equal(output.ifd0[MAKE], 'Apple')
		assert.equal(output.ifd0[MODEL], 'iPhone 7')
	})

	it(`address of ICC from HEIC should align properly`, async () => {
		let input = await getFile('heic-iphone7.heic')
		let output = await exifr.parse(input, options)
		assert.equal(output.icc[4].toLowerCase(),  'appl') // ProfileCMMType
		assert.equal(output.icc[16], 'RGB') // ColorSpaceData
		assert.equal(output.icc[36], 'acsp') // ProfileFileSignature
		assert.equal(output.icc[40].toLowerCase(), 'appl') // PrimaryPlatform
	})

})