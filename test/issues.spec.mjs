import {assert} from './test-util-core.mjs'
import {getFile, getPath} from './test-util-core.mjs'
import * as exifr from '../src/bundles/full.mjs'


describe('issues (special cases)', () => {

    // TODO: maybe move this test to input (reader) test file and rename it to .tif file support
    it(`#2 - 001.tif`, async () => {
        var output = await exifr.parse(await getFile('001.tif'))
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
        var output = await exifr.parse(await getFile('002.tiff'), options)
        assert.exists(output.gps)
    })

	it(`#31 IPTC BUG: RangeError_Offset_outside_bounds.jpg`, async () => {
		let input = await getPath('RangeError_Offset_outside_bounds.jpg')
		let options = {
			tiff: false,
			iptc: true
		}
        var output = await exifr.parse(input, options)
		assert.equal(output.ApplicationRecordVersion, '\x00\x02')
		assert.equal(output.ObjectName, 'THYSSENKRUPP-RESTRUCTURING/STEEL')
		assert.equal(output.City, 'NEUSS')
		assert.equal(output.LanguageIdentifier, 'en')
	})

	it(`#31 ICC BUG: RangeError_Invalid_typed_array_length.jpg`, async () => {
		let input = await getPath('RangeError_Invalid_typed_array_length.jpg')
		let options = {
			tiff: false,
			icc: true
		}
        var output = await exifr.parse(input, options)
		assert.equal(output.ProfileVersion, '2.0.0')
		assert.equal(output.ProfileDescription, 'opRGB')
	})

    it(`fast-exif #2 - should not skip exif if 0xFF byte precedes marker`, async () => {
        var output = await exifr.parse(await getFile('issue-fast-exif-2.jpg'), true)
        assert.exists(output, `output is undefined`)
        assert.equal(output.ApertureValue, 5.655638)
        assert.equal(output.LensModel, '24.0-70.0 mm f/2.8')
    })

    it(`exif-js #124`, async () => {
        var output = await exifr.parse(await getFile('issue-exif-js-124.tiff'), true)
        assert.exists(output, `output is undefined`)
        assert.equal(output.Make, 'FLIR')
    })

	// ttps://github.com/drewnoakes/metadata-extractor/issues/151
    it(`metadata-extractor #152 jpg`, async () => {
		let input = await getFile('issue-metadata-extractor-152.jpg')
		let options = {tiff: true, xmp: true, mergeOutput: true}
        var output = await exifr.parse(input, options)
        assert.equal(output.Make, 'Parrot')
        assert.equal(output.ISO, 100)
        assert.equal(output.GPSMapDatum, 'WGS-84')
		// xmp (camera namespace)
        assert.equal(output.RigName, 'Chlorophyll')
        assert.equal(output.Pitch, 13.239553)
    })

	// ttps://github.com/drewnoakes/metadata-extractor/issues/151
    it(`metadata-extractor #152 tif`, async () => {
		let input = await getFile('issue-metadata-extractor-152.tif')
		let options = {tiff: true, xmp: true, mergeOutput: true}
        var output = await exifr.parse(input, options)
        assert.equal(output.Make, 'Parrot') // tiff ifd0 block
        assert.equal(output.ISO, 200) // tiff exif block
        assert.equal(output.GPSMapDatum, 'WGS-84') // tiff gps block
		// xmp
        assert.equal(output.RigName, 'Chlorophyll')
        assert.equal(output.Roll, 0.172856)
    })
/*
    // TODO
    it(`#3 FLIR`, async () => {
        let options = {???}
        var output = await exifr.parse(getPath('issue-exifr-3.jpg'), options)
        assert.exists(output.gps)
    })
*/

})