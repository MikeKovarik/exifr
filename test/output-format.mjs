import {parse} from '../index.mjs'
import {assert} from './test-util.mjs'
import {getFile} from './test-util.mjs'


describe('output object', () => {

	it(`should return undefined if no exif was found`, async () => {
		var output = await parse(await getFile('img_1771_no_exif.jpg'))
		console.log('output', output)
		assert.equal(output, undefined)
	})

	it(`should return undefined if no exif was found (internal .parse() method)`, async () => {
		let intput = await getFile('noexif.jpg')
		let parser = new ExifParser()
		await parser.parse(intput)
		let output = await parser.parse()
		assert.isUndefined(output)
	})

	it(`contains multiple requested segments`, async () => {
		let options = {xmp: true, jfif: true, wholeFile: true, mergeOutput: false}
		let input = getPath('exifr-issue-4.jpg')
		let output = await parse(input, options)
		assert.isObject(output, `output is undefined`)
		assert.exists(output.jfif)
		assert.exists(output.xmp)
	})

    it(`should merge all segments by default`, async () => {
        var output = await parse(await getFile('IMG_20180725_163423.jpg'))
        assert.exists(output, `output is undefined`)
        assert.equal(output.Make, 'Google')
        assert.equal(output.ExposureTime, 0.000376)
        assert.equal(output.GPSLongitude.length, 3)
    })

    it(`should translate values to string by default`, async () => {
        var output = await parse(await getFile('IMG_20180725_163423.jpg'))
        assert.exists(output, `output is undefined`)
        assert.equal(output.Contrast, 'Normal')
        assert.equal(output.MeteringMode, 'CenterWeightedAverage')
    })

    it(`should not translate values to string if options.postProcess = false`, async () => {
        var output = await parse(await getFile('IMG_20180725_163423.jpg'), {postProcess: false})
        assert.exists(output, `output is undefined`)
        assert.equal(output.Contrast, 0)
        assert.equal(output.MeteringMode, 2)
    })

    it(`should revive dates as Date instance by default`, async () => {
        var output = await parse(await getFile('IMG_20180725_163423.jpg'))
        assert.exists(output, `output is undefined`)
        assert.instanceOf(output.DateTimeOriginal, Date)
    })

    it(`should not revive dates as Date instance if options.postProcess = false`, async () => {
        var output = await parse(await getFile('IMG_20180725_163423.jpg'), {postProcess: false})
        assert.exists(output, `output is undefined`)
        assert.equal(output.DateTimeOriginal, '2018:07:25 16:34:23')
    })

})
