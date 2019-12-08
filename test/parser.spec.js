import {assert} from './test-util.js'
import {isBrowser, isNode, getPath, getUrl, getFile} from './test-util.js'
import {parse, Exifr} from '../src/index-full.js'



describe('JpegFileParser', () => {

	describe('.findAppSegments()', () => {

		it(`finds APP segments existing in jpg file`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let exifr = new Exifr({tiff: true, xmp: true, jfif: true})
			await exifr.read(input)
			exifr.init()
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
			exifr.init()
			let jpegFileParser = exifr.fileParser
			jpegFileParser.findAppSegments()
			let xmpSegment = jpegFileParser.appSegments.find(segment => segment.type === 'xmp')
			assert.isUndefined(xmpSegment)
		})

	})

})
/*
describe('TiffFileParser', () => {
})
*/