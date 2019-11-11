import {assert} from './test-util.js'
import {getFile, getPath} from './test-util.js'
import {parse} from '../src/index-full.js'


describe('issues (special cases)', () => {

    // TODO: maybe move this test to input (reader) test file and rename it to .tif file support
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
        var output = await parse(getPath('issue-exifr-3.jpg'), options)
        console.log(output)
        assert.exists(output.gps)
    })
*/

    it(`fast-exif #2 - should not skip exif if 0xFF byte precedes marker`, async () => {
        var output = await parse(await getFile('issue-fast-exif-2.jpg'), true)
        assert.exists(output, `output is undefined`)
        assert.equal(output.ApertureValue, 5.655638)
        assert.equal(output.LensModel, '24.0-70.0 mm f/2.8')
    })

    it(`exif-js #124`, async () => {
        var output = await parse(await getFile('issue-exif-js-124.tiff'), true)
        assert.exists(output, `output is undefined`)
        assert.equal(output.Make, 'FLIR')
    })

	/*
	TODO
	https://github.com/drewnoakes/metadata-extractor/issues/151
	issue-metadata-extractor-152.jpg
	issue-metadata-extractor-152.tif
	*/

	// TODO: implement
    it(`metadata-extractor #152 jpg`, async () => {
		let input = await getFile('issue-metadata-extractor-152.jpg')
        var output = await parse(input, true)
        assert.equal(true, false)
    })

	// TODO: implement
    it(`metadata-extractor #152 tif`, async () => {
		let input = await getFile('issue-metadata-extractor-152.jpg')
        var output = await parse(input, true)
        assert.equal(true, false)
    })

})

