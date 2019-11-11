import {assert} from './test-util.js'
import {getFile, getPath, testSegment} from './test-util.js'
import {parse} from '../src/index-full.js'
import XmpParser from '../src/parsers/xmp.js'


describe('XMP Segment', () => {

	testSegment({
		key: 'xmp',
		fileWith: 'cookiezen.jpg',
		fileWithout: 'img_1771_no_exif.jpg',
		definedByDefault: false
	})

    it(`output.xmp is string when {xmp: true, mergeOutput: true}`, async () => {
        let options = {mergeOutput: true, xmp: true}
        let input = await getFile('cookiezen.jpg')
        let output = await parse(input, options) || {}
        assert.isString(output.xmp, `output doesn't contain xmp`)
    })

    it(`output.xmp is string when {xmp: true, mergeOutput: false}`, async () => {
        let options = {mergeOutput: false, xmp: true}
        let input = await getFile('cookiezen.jpg')
        let output = await parse(input, options) || {}
        assert.isString(output.xmp, `output doesn't contain xmp`)
    })

    it(`should parse XMP independenly (even if the file doesn't have TIFF)`, async () => {
        let options = {mergeOutput: false, xmp: true, wholeFile: true}
        let input = getPath('issue-exifr-4.jpg')
        let output = await parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
    })

	it(`should parse .tif file with scattered data segments when {xmp: true, tiff: true)`, async () => {
		let options = {mergeOutput: false, xmp: true, tiff: true}
		let input = await getFile('001.tif')
		var output = await parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
	})

	it(`should parse .tif file with scattered data segments when {xmp: true, tiff: false)`, async () => {
		let options = {mergeOutput: false, xmp: true, tiff: false}
		let input = await getFile('001.tif')
		var output = await parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
	})

    it(`issue exifr #4 whole file`, async () => {
		let input = await getFile('issue-exifr-4.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue exifr #4 chunked`, async () => {
		let input = getPath('issue-exifr-4.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue exifr #13 whole file`, async () => {
		let input = await getFile('issue-exifr-13.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue exifr #13 chunked`, async () => {
		let input = getPath('issue-exifr-13.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue node-exif #58 whole file`, async () => {
		let input = await getFile('issue-node-exif-58.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue node-exif #58 chunked`, async () => {
		let input = getPath('issue-node-exif-58.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await parse(input, options)
        assert.exists(output.xmp, `output doesn't contain xmp`)
    })

/*
	it(`.tif file with scattered data segments should contain XMP (options.tiff disabled)`, async () => {
		let options = {tiff: false, xmp: true, mergeOutput: false}
		let input = await getFile('001.tif')
		var output = await parse(input, options)
		console.log(output.ifd0.ApplicationNotes)
		console.log(Buffer.from(output.ifd0.ApplicationNotes).toString())
		assert.isDefined(output.xmp)
	})
*/

})
