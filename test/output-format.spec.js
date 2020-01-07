import {assert} from './test-util.js'
import {getFile, getPath} from './test-util.js'
import Exifr from '../src/index-full.js'


describe('output object format', () => {

	it(`should return undefined if no exif was found`, async () => {
		let output = await Exifr.parse(await getFile('img_1771_no_exif.jpg'))
		assert.equal(output, undefined)
	})

	it(`should return undefined if no exif was found (internal .parse() method)`, async () => {
		let intput = await getFile('noexif.jpg')
		let exifr = new Exifr()
		await exifr.read(intput)
		let output = await exifr.parse()
		assert.isUndefined(output)
	})

	it(`contains multiple requested segments`, async () => {
		let options = {xmp: true, jfif: true, wholeFile: true, mergeOutput: false}
		let input = getPath('issue-exifr-4.jpg')
		let output = await Exifr.parse(input, options)
		assert.isObject(output, `output is undefined`)
		assert.exists(output.jfif)
		assert.exists(output.xmp)
	})

	it(`should merge all segments by default`, async () => {
		let input = await getFile('IMG_20180725_163423.jpg')
		let output = await Exifr.parse(input)
		assert.exists(output, `output is undefined`)
		assert.equal(output.Make, 'Google')
		assert.equal(output.ExposureTime, 0.000376)
		assert.equal(output.GPSLongitude.length, 3)
	})

	it(`should revive dates as Date instance by default`, async () => {
		let input = await getFile('IMG_20180725_163423.jpg')
		let options = {}
		let output = await Exifr.parse(input, options)
		assert.exists(output, `output is undefined`)
		assert.instanceOf(output.DateTimeOriginal, Date)
	})

	it(`should revive dates as Date instance when {reviveValues: true}`, async () => {
		let input = await getFile('IMG_20180725_163423.jpg')
		let options = {reviveValues: true}
		let output = await Exifr.parse(input, options)
		assert.exists(output, `output is undefined`)
		assert.instanceOf(output.DateTimeOriginal, Date)
	})

	it(`should not revive dates as Date instance when {reviveValues: false}`, async () => {
		let input = await getFile('IMG_20180725_163423.jpg')
		let options = {reviveValues: false}
		let output = await Exifr.parse(input, options)
		assert.exists(output, `output is undefined`)
		assert.equal(output.DateTimeOriginal, '2018:07:25 16:34:23')
	})

	describe('Extracting XMP from TIFF - ApplicationNotes (xmp in .tif)', () => {

		let filePath = 'issue-metadata-extractor-152.tif'
		testSegmentFromTiffTag('xmp', 'ApplicationNotes', 0x02BC, filePath)

		it(`output.xmp should be empty and skipped with default options`, async () => {
			const XMP = 0x02BC
			let input = await getPath('issue-exif-js-124.tiff')
			let options = {wholeFile: false, mergeOutput: false}
			let exifr = new Exifr(options)
			await exifr.read(input)
			let output = await exifr.parse()
			await exifr.file.close()
            assert.include(exifr.options.ifd0.skip, XMP)
			assert.isObject(output)
			assert.isUndefined(output.xmp)
		})

		it(`output.xmp should not be empty when {xmp: true}`, async () => {
			let input = await getPath('issue-exif-js-124.tiff')
			let options = {wholeFile: false, mergeOutput: false, xmp: true}
			let exifr = new Exifr(options)
			await exifr.read(input)
			let output = await exifr.parse()
			await exifr.file.close()
			assert.isObject(output)
			assert.isNotEmpty(output.xmp)
		})

	})

	describe('Extracting IPTC from TIFF', () => {
		testSegmentFromTiffTag('iptc', 'IPTC', 0x83bb, 'tif-with-iptc-icc-xmp.tif')
	})

	describe('Extracting ICC from TIFF', () => {
		testSegmentFromTiffTag('icc', 'ICC', 0x8773, 'tif-with-iptc-icc-xmp.tif')
	})


	function testSegmentFromTiffTag(segName, propName, propCode, filePath) {
		let input
		before(async () => input = await getFile(filePath))

		it(`is moved from tiff to output.${segName}`, async () => {
			let options = {mergeOutput: false, [segName]: true}
			var output = await Exifr.parse(input, options) || {}
			assert.exists(output[segName])
			assert.isUndefined(output.ifd0[propName])
			assert.isUndefined(output.ifd0[propCode])
		})

		it(`is available as output.${segName} when {${segName}: true, tiff: false}`, async () => {
			let options = {mergeOutput: false, [segName]: true, tiff: false}
			var output = await Exifr.parse(input, options) || {}
			assert.exists(output[segName])
		})

		it(`is not available as output.${segName} when {${segName}: false, tiff: true}`, async () => {
			let options = {mergeOutput: false, [segName]: false, tiff: true}
			var output = await Exifr.parse(input, options) || {}
			assert.isUndefined(output[segName])
		})

		it(`is skipped (not parsed from TIFF) when {${segName}: false, tiff: true}`, async () => {
			let options = {mergeOutput: false, [segName]: false, tiff: true}
			var exifr = new Exifr(options)
			await exifr.read(input)
			await exifr.parse(input)
			assert.include(Array.from(exifr.options.ifd0.skip), propCode)
		})
	}

})
