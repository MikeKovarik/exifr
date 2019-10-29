import {parse} from '../index.mjs'
import {assert} from './test-util.mjs'
import {getFile, getPath} from './test-util.mjs'
import XmpParser from '../src/parsers/xmp.mjs'


describe('XMP', () => {

    it(`output.xmp is undefined by default`, async () => {
        let options = {mergeOutput: false}
        let input = await getFile('cookiezen.jpg')
        let output = await parse(input, options)
        assert.exists(output, `output is undefined`)
        assert.isUndefined(output.xmp, `xmp shouldn't be included`)
    })

    it(`output.xmp is undefined when {xmp: false}`, async () => {
        let options = {mergeOutput: false, xmp: false}
        let input = await getFile('cookiezen.jpg')
        let output = await parse(input, options)
        assert.exists(output, `output is undefined`)
        assert.isUndefined(output.xmp, `xmp shouldn't be included`)
    })

    it(`output.xmp is string when {xmp: true}`, async () => {
        let options = {mergeOutput: false, xmp: true}
        let input = await getFile('cookiezen.jpg')
        let output = await parse(input, options)
        assert.exists(output, `output is undefined`)
        //assert.isDefined(output.xmp, `xmp should be included`)
        assert.typeOf(output.xmp, 'string', `output doesn't contain xmp`)
    })

    it(`output.xmp is undefined if no xmp was found`, async () => {
        let input = await getFile('img_1771_no_exif.jpg')
        let output = await parse(input)
        assert.exists(output, `output is undefined`)
        assert.isUndefined(output.xmp, `xmp shouldn't be included`)
    })

    it(`should parse XMP independenly (even if the file doesn't have TIFF)`, async () => {
        let options = {mergeOutput: false, xmp: true, wholeFile: true}
        let input = getPath('exifr-issue-4.jpg')
        let output = await parse(input, options)
        assert.isObject(output, `output is undefined`)
        assert.exists(output.xmp, `xmp doesn't exist on exif`)
    })
/*
    it(`issue 13`, async () => {
        let output = await parse(getPath('exifr-issue-13.jpg'), {mergeOutput: false, xmp: true, wholeFile: true})
        assert.isObject(output, `output is undefined`)
        assert.exists(output.xmp, `xmp doesn't exist on exif`)
    })
*/
})
