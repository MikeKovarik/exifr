import {parse} from '../index.mjs'
import {assert} from './test-util.mjs'
import {getFile, getPath} from './test-util.mjs'


describe('issues (special cases)', () => {

    it(`#2 - 001.tif starting with 49 49`, async () => {
        var output = await parse(await getFile('001.tif'))
        assert.exists(output, `output is undefined`)
        assert.equal(output.Make, 'DJI')
        assert.equal(output.ImageWidth, '640')
        //assert.equal(output.ImageHeight, '512')
        assert.equal(output.latitude, 50.86259891666667)
    })

    it(`#2 - 002.tiff with value type 13 (IFD pointer) instead of 4`, async () => {
        let options = {
            gps: true,
            mergeOutput: false,
        }
        var output = await parse(await getFile('002.tiff'), options)
        assert.exists(output.gps)
    })
/*
    // TODO
    it(`#3 - app1 completeness`, async () => {
        let options = {
            tiff: true,
            exif: true,
            xmp: true,
            mergeOutput: false,
        }
        var output = await parse(getPath('exifr-issue-3.jpg'), options)
        console.log(output)
        assert.exists(output.gps)
    })
*/

    it(`#4`, async () => {
        let options = {xmp: true, wholeFile: true, mergeOutput: false}
        var output = await parse(getPath('exifr-issue-4.jpg'), options)
        assert.isObject(output, `output is undefined`)
        assert.exists(output.xmp, `xmp doesn't exist on exif`)
        // not sure what to do with this yet
    })

    it(`#13 - properly read big XMP out of the box`, async () => {
        var output = await parse(getPath('exifr-issue-13.jpg'))
        assert.isObject(output, `output is undefined`)
        assert.exists(output.xmp, `xmp doesn't exist on exif`)
    })

    it(`fast-exif #2 - should not skip exif if 0xFF byte precedes marker`, async () => {
        var output = await parse(await getFile('fast-exif-issue-2.jpg'), true)
        assert.exists(output, `output is undefined`)
        assert.equal(output.ApertureValue, 5.655638)
        assert.equal(output.LensModel, '24.0-70.0 mm f/2.8')
    })

    it(`node-exif #58 - should properly detect EXIF`, async () => {
        var output = await parse(await getFile('node-exif-issue-58.jpg'), true)
        assert.exists(output, `output is undefined`)
        assert.exists(output.xmp)
    })

    it(`exif-js #124`, async () => {
        var output = await parse(await getFile('exif-js-issue-124.tiff'), true)
        assert.exists(output, `output is undefined`)
        assert.equal(output.Make, 'FLIR')
    })

})
