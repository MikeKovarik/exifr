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

    it(`ApplicationNotes (xmp in .tif) is moved from tiff to output.xmp`, async () => {
		let input = await getFile('issue-metadata-extractor-152.tif')
        var output = await parse(input, {mergeOutput: false}) || {}
        assert.exists(output.xmp)
        assert.isUndefined(output.ifd0.ApplicationNotes)
        assert.isUndefined(output.ifd0[0x02BC])
    })

    // TODO: this behavior should be changed in future version when detecting the file as .tif
    it(`ApplicationNotes (xmp in .tif) is available output.xmp despite {tiff: false}`, async () => {
		let input = await getFile('issue-metadata-extractor-152.tif')
        var output = await parse(input, {mergeOutput: false, tiff: false}) || {}
        assert.exists(output.xmp)
    })

    it(`ApplicationNotes (xmp in .tif) is moved from tiff to output.xmp as not parsed string despite {xmp: false}`, async () => {
		let input = await getFile('issue-metadata-extractor-152.tif')
        var output = await parse(input, {mergeOutput: false, xmp: false}) || {}
        assert.isString(output.xmp)
    })

})
