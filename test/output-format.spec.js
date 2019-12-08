import {assert} from './test-util.js'
import {getFile, getPath} from './test-util.js'
import {parse, ExifParser} from '../src/index-full.js'


describe('output object', () => {

	it(`should return undefined if no exif was found`, async () => {
		let output = await parse(await getFile('img_1771_no_exif.jpg'))
		assert.equal(output, undefined)
	})

	it(`should return undefined if no exif was found (internal .parse() method)`, async () => {
		let intput = await getFile('noexif.jpg')
		let exifr = new ExifParser()
		await exifr.read(intput)
		let output = await exifr.parse()
		assert.isUndefined(output)
	})

	it(`contains multiple requested segments`, async () => {
		let options = {xmp: true, jfif: true, wholeFile: true, mergeOutput: false}
		let input = getPath('issue-exifr-4.jpg')
		let output = await parse(input, options)
		assert.isObject(output, `output is undefined`)
		assert.exists(output.jfif)
		assert.exists(output.xmp)
	})

    it(`should merge all segments by default`, async () => {
        let input = await getFile('IMG_20180725_163423.jpg')
		let output = await parse(input)
        assert.exists(output, `output is undefined`)
        assert.equal(output.Make, 'Google')
        assert.equal(output.ExposureTime, 0.000376)
        assert.equal(output.GPSLongitude.length, 3)
    })

    it(`should revive dates as Date instance by default`, async () => {
        let input = await getFile('IMG_20180725_163423.jpg')
		let options = {}
		let output = await parse(input, options)
        assert.exists(output, `output is undefined`)
        assert.instanceOf(output.DateTimeOriginal, Date)
    })

    it(`should revive dates as Date instance when {reviveValues: true}`, async () => {
        let input = await getFile('IMG_20180725_163423.jpg')
		let options = {reviveValues: true}
		let output = await parse(input, options)
        assert.exists(output, `output is undefined`)
        assert.instanceOf(output.DateTimeOriginal, Date)
    })

    it(`should not revive dates as Date instance when {reviveValues: false}`, async () => {
        let input = await getFile('IMG_20180725_163423.jpg')
		let options = {reviveValues: false}
		let output = await parse(input, options)
        assert.exists(output, `output is undefined`)
        assert.equal(output.DateTimeOriginal, '2018:07:25 16:34:23')
    })

	describe('Extracting XMP from TIFF - ApplicationNotes (xmp in .tif)', () => {

		let segName = 'xmp'
		let propName = 'ApplicationNotes'
		let propCode = 0x02BC
		let input
		let filePath = 'issue-metadata-extractor-152.tif'
		before(async () => {
			input = await getFile(filePath)
		})

		it(`is moved from tiff to output.${segName}`, async () => {
			var output = await parse(input, {mergeOutput: false}) || {}
			assert.exists(output[segName])
			assert.isUndefined(output.ifd0[propName])
			assert.isUndefined(output.ifd0[propCode])
		})

		// TODO: this behavior should be changed in future version when detecting the file as .tif
		it(`is available output.${segName} despite {tiff: false}`, async () => {
			var output = await parse(input, {mergeOutput: false, tiff: false}) || {}
			assert.exists(output[segName])
		})

		it(`is moved from tiff to output.${segName} as not parsed string despite {xmp: false}`, async () => {
			var output = await parse(input, {mergeOutput: false, [segName]: false}) || {}
			assert.isString(output[segName])
		})

    })

	describe('Extracting IPTC from TIFF', () => {

		let segName = 'iptc'
		let propName = 'IPTC'
		let propCode = 0x83bb
		let input
		let filePath = 'tif-with-iptc-icc-xmp.tif'
		before(async () => {
			input = await getFile(filePath)
		})

		it(`is moved from tiff to output.${segName}`, async () => {
			let options = {mergeOutput: false, [segName]: true}
			var output = await parse(input, options) || {}
			console.log(output)
			assert.exists(output[segName])
			assert.isUndefined(output.ifd0[propName])
			assert.isUndefined(output.ifd0[propCode])
		})

		// TODO: this behavior should be changed in future version when detecting the file as .tif
		it(`is available output.${segName} despite {tiff: false}`, async () => {
			let options = {mergeOutput: false, [segName]: true, tiff: false}
			var output = await parse(input, options) || {}
			console.log(output)
			assert.exists(output[segName])
		})
/*
		it(`is moved from tiff to output.${segName} as not parsed string despite {xmp: false}`, async () => {
			let options = {mergeOutput: false, [segName]: false}
            console.log('TCL: options', options)
			var output = await parse(input, options) || {}
			assert.isString(output[segName])
		})
*/
    })

	describe('Extracting ICC from TIFF', () => {
		//0x8773: 'ICC',
	})

})
