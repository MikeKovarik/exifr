import {assert} from './test-util.js'
import {isBrowser, isNode, getPath, getUrl, getFile} from './test-util.js'
import Exifr from '../src/index-full.js'



describe('JPEG - JpegFileParser', () => {

	describe('.findAppSegments()', () => {

		it(`finds APP segments existing in jpg file`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let exifr = new Exifr({tiff: true, xmp: true, jfif: true})
			await exifr.read(input)
			exifr.setup()
			let jpegFileParser = exifr.fileParser
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
			let exifr = new Exifr({tiff: true, xmp: true, jfif: true})
			await exifr.read(input)
			exifr.setup()
			let jpegFileParser = exifr.fileParser
			jpegFileParser.findAppSegments()
			let xmpSegment = jpegFileParser.appSegments.find(segment => segment.type === 'xmp')
			assert.isUndefined(xmpSegment)
		})

		it(`multisegment ICC - finds all segments`, async () => {
			let input = await getFile('issue-metadata-extractor-65.jpg')
			let exifr = new Exifr(true)
			await exifr.read(input)
			exifr.setup()
			let jpegFileParser = exifr.fileParser
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
		let output = await Exifr.parse(input, options)
		assert.isUndefined(output, 'output should be undefined')
	})

	it(`should not find anything in fixture2`, async () => {
		let input = await getFile('heic-collection.heic')
		let output = await Exifr.parse(input, options)
		assert.isUndefined(output, 'output should be undefined')
	})

	it(`should extract TIFF & ICC from fixture3`, async () => {
		let input = await getFile('heic-empty.heic')
		let output = await Exifr.parse(input, options)
		assert.exists(output.ifd0, 'output should contain IFD0')
		assert.exists(output.icc, 'output should contain ICC')
		assert.equal(output.icc[16], 'RGB') // ColorSpaceData
	})

	it(`should extract TIFF & ICC from fixture4`, async () => {
		let input = await getFile('heic-iphone.heic')
		let output = await Exifr.parse(input, options)
		assert.exists(output.ifd0, 'output should contain IFD0')
		assert.exists(output.exif, 'output should contain EXIF')
		assert.exists(output.gps,  'output should contain GPS')
		assert.exists(output.icc,  'output should contain ICC')
		assert.equal(output.ifd0[MAKE], 'Apple')
		assert.equal(output.ifd0[MODEL], 'iPhone XS Max')
	})

	it(`should extract TIFF & ICC from fixture5`, async () => {
		let input = await getFile('heic-iphone7.heic')
		let output = await Exifr.parse(input, options)
		assert.exists(output.ifd0, 'output should contain IFD0')
		assert.exists(output.exif, 'output should contain EXIF')
		assert.exists(output.gps,  'output should contain GPS')
		assert.exists(output.icc,  'output should contain ICC')
	})

	it(`address of TIFF/EXIF from HEIC should slign properly`, async () => {
		let input = await getFile('heic-iphone7.heic')
		let output = await Exifr.parse(input, options)
		assert.equal(output.ifd0[MAKE], 'Apple')
		assert.equal(output.ifd0[MODEL], 'iPhone 7')
	})

	it(`address of ICC from HEIC should slign properly`, async () => {
		let input = await getFile('heic-iphone7.heic')
		let output = await Exifr.parse(input, options)
		assert.equal(output.icc[4].toLowerCase(),  'appl') // ProfileCMMType
		assert.equal(output.icc[16], 'RGB') // ColorSpaceData
		assert.equal(output.icc[36], 'acsp') // ProfileFileSignature
		assert.equal(output.icc[40].toLowerCase(), 'appl') // PrimaryPlatform
	})

})