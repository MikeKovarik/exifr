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

		it(`multipage ICC - finds all segments`, async () => {
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

	let options = {tiff: true, icc: true, mergeOutput: false}

	it(`fixture1 iloc & only`, async () => {
		let input = await getFile('heic-single.heic')
		let output = await Exifr.parse(input, options)
        console.log('-: output', output)
		assert.isTrue(false)
	})

	it(`fixture2 iloc & only`, async () => {
		let input = await getFile('heic-collection.heic')
		let output = await Exifr.parse(input, options)
        console.log('-: output', output)
		assert.isTrue(false)
	})

	it(`fixture3 iloc & exif`, async () => {
		let input = await getFile('heic-empty.heic')
		let output = await Exifr.parse(input, options)
        console.log('-: output', output)
		assert.isTrue(false)
	})

	it(`fixture4 iloc & exif`, async () => {
		let input = await getFile('heic-iphone.heic')
		let output = await Exifr.parse(input, options)
        console.log('-: output', output)
		assert.isTrue(false)
	})

	it(`fixture5 iloc & exif`, async () => {
		let input = await getFile('heic-iphone7.heic')
		let output = await Exifr.parse(input, options)
        console.log('-: output', output)
		assert.isTrue(false)
	})

})