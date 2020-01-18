import {assert} from './test-util.js'
import {getFile, getPath, testSegment} from './test-util.js'
import Exifr from '../src/index-full.js'
import XmpParser from '../src/segment-parsers/xmp.js'


describe('XMP Segment', () => {

	describe('enable/disable in options', () => {

        testSegment({
            key: 'xmp',
            fileWith: 'cookiezen.jpg',
            fileWithout: 'img_1771_no_exif.jpg',
            definedByDefault: false
        })

        it(`output.xmp is string when {xmp: true, mergeOutput: true}`, async () => {
            let options = {mergeOutput: true, xmp: true}
            let input = await getFile('cookiezen.jpg')
            let output = await Exifr.parse(input, options) || {}
            assert.isString(output.xmp, `output doesn't contain xmp`)
        })

        it(`output.xmp is string when {xmp: true, mergeOutput: false}`, async () => {
            let options = {mergeOutput: false, xmp: true}
            let input = await getFile('cookiezen.jpg')
            let output = await Exifr.parse(input, options) || {}
            assert.isString(output.xmp, `output doesn't contain xmp`)
        })

    })

    it(`should parse XMP independenly (even if the file doesn't have TIFF)`, async () => {
        let options = {mergeOutput: false, xmp: true, wholeFile: true}
        let input = getPath('issue-exifr-4.jpg')
        let output = await Exifr.parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
    })

	it(`should parse .tif file with scattered data segments when {xmp: true, tiff: true)`, async () => {
		let options = {mergeOutput: false, xmp: true, tiff: true}
		let input = await getFile('001.tif')
		var output = await Exifr.parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
	})

	it(`should parse .tif file with scattered data segments when {xmp: true, tiff: false)`, async () => {
		let options = {mergeOutput: false, xmp: true, tiff: false}
		let input = await getFile('001.tif')
		var output = await Exifr.parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
	})

    it(`issue exifr #4 whole file`, async () => {
		let input = await getFile('issue-exifr-4.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await Exifr.parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue exifr #4 chunked`, async () => {
		let input = getPath('issue-exifr-4.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await Exifr.parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue exifr #13 whole file`, async () => {
		let input = await getFile('issue-exifr-13.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await Exifr.parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue exifr #13 chunked`, async () => {
		let input = getPath('issue-exifr-13.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await Exifr.parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue node-exif #58 whole file`, async () => {
		let input = await getFile('issue-node-exif-58.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await Exifr.parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue node-exif #58 chunked`, async () => {
		let input = getPath('issue-node-exif-58.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await Exifr.parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
    })

	it(`should extract XMP from .tif file with scattered data segments when {tiff: true, xmp: true}`, async () => {
		let options = {tiff: true, xmp: true, mergeOutput: false}
		let input = await getFile('001.tif')
		var output = await Exifr.parse(input, options)
		assert.isDefined(output.xmp)
	})

	it(`should extract XMP from .tif file with scattered data segments when {tiff: false, xmp: true}`, async () => {
		let options = {tiff: false, xmp: true, mergeOutput: false}
		let input = await getFile('001.tif')
		var output = await Exifr.parse(input, options)
		assert.isDefined(output.xmp)
	})

})