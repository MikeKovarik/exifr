import {assert} from './test-util.js'
import {getFile, getPath, testSegment} from './test-util.js'
import * as exifr from '../src/index-full.js'
import XmpParser from '../src/segment-parsers/xmp.js'


describe('XMP Segment', () => {

	describe('options.xmp enable/disable', () => {
        testSegment({
            key: 'xmp',
            fileWith: 'cookiezen.jpg',
            fileWithout: 'img_1771_no_exif.jpg',
            definedByDefault: false
        })
    })

	describe('options.mergeOutput', () => {

        it(`output.xmp is string when {xmp: true, mergeOutput: true}`, async () => {
            let options = {mergeOutput: true, xmp: true}
            let input = await getFile('cookiezen.jpg')
            let output = await exifr.parse(input, options) || {}
            assert.isString(output.xmp, `output doesn't contain xmp`)
        })

        it(`output.xmp is string when {xmp: true, mergeOutput: false}`, async () => {
            let options = {mergeOutput: false, xmp: true}
            let input = await getFile('cookiezen.jpg')
            let output = await exifr.parse(input, options) || {}
            assert.isString(output.xmp, `output doesn't contain xmp`)
        })

    })

    it(`should parse XMP independenly (even if the file doesn't have TIFF)`, async () => {
        let options = {mergeOutput: false, xmp: true, wholeFile: true}
        let input = getPath('issue-exifr-4.jpg')
        let output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
    })

	it(`should parse .tif file with scattered data segments when {xmp: true, tiff: true)`, async () => {
		let options = {mergeOutput: false, xmp: true, tiff: true}
		let input = await getFile('001.tif')
		var output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
	})

	it(`should parse .tif file with scattered data segments when {xmp: true, tiff: false)`, async () => {
		let options = {mergeOutput: false, xmp: true, tiff: false}
		let input = await getFile('001.tif')
		var output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
	})

    it(`issue exifr #4 whole file`, async () => {
		let input = await getFile('issue-exifr-4.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue exifr #4 chunked`, async () => {
		let input = getPath('issue-exifr-4.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue exifr #13 whole file`, async () => {
		let input = await getFile('issue-exifr-13.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue exifr #13 chunked`, async () => {
		let input = getPath('issue-exifr-13.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue node-exif #58 whole file`, async () => {
		let input = await getFile('issue-node-exif-58.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue node-exif #58 chunked`, async () => {
		let input = getPath('issue-node-exif-58.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
    })

	it(`should extract XMP from .tif file with scattered data segments when {tiff: true, xmp: true}`, async () => {
		let options = {tiff: true, xmp: true, mergeOutput: false}
		let input = await getFile('001.tif')
		var output = await exifr.parse(input, options)
		assert.isNotEmpty(output.xmp)
	})

	it(`should extract XMP from .tif file with scattered data segments when {tiff: false, xmp: true}`, async () => {
		let options = {tiff: false, xmp: true, mergeOutput: false}
		let input = await getFile('001.tif')
		var output = await exifr.parse(input, options)
		assert.isNotEmpty(output.xmp)
	})

	// this file was buggy and did not parse properly. do not remove this test.

	it(`should not be empty when the XMP string starts with '<?xpacket><rdf:RDF>'`, async () => {
		let options = {tiff: false, xmp: true, mergeOutput: false}
		let input = await getFile('issue-exif-js-124.tiff')
		var output = await exifr.parse(input, options)
		assert.isNotEmpty(output.xmp)
	})

	it(`should not be empty when the XMP string starts with '<x:xmpmeta><rdf:RDF>'`, async () => {
		let options = {tiff: false, xmp: true, mergeOutput: false}
		let input = await getFile('PANO_20180714_121453.jpg')
		var output = await exifr.parse(input, options)
		assert.isNotEmpty(output.xmp)
	})

	it(`should not be empty when the XMP string starts with '<?xpacket><x:xmpmeta>'`, async () => {
		let options = {tiff: false, xmp: true, mergeOutput: false}
		let input = await getFile('cookiezen.jpg')
		var output = await exifr.parse(input, options)
		assert.isNotEmpty(output.xmp)
	})

})
