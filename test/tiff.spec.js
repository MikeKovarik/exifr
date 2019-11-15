import {assert} from './test-util.js'
import {getFile, testSegment, testTranslation} from './test-util.js'
import {parse} from '../src/index-full.js'


function testBlockResult(output, blockName, results = {}) {
	assert.isObject(output[blockName], `output.${blockName} is undefined`)
	for (let [key, val] of Object.entries(results)) {
		assert.equal(output[blockName][key], val)
	}
}

function testBlock(blockName, enabledByDefault, results = {}) {
	let filePath = 'IMG_20180725_163423.jpg'

	it(`output.${blockName} is undefined when {${blockName}: false}`, async () => {
		let options = {mergeOutput: false, [blockName]: false}
		let input = await getFile(filePath)
		let output = await parse(input, options) || {}
		assert.isUndefined(output[blockName], `output shouldn't contain ${blockName}`)
	})

	it(`output.${blockName} is undefined when {tiff: false}`, async () => {
		let options = {mergeOutput: false, tiff: false}
		let input = await getFile(filePath)
		let output = await parse(input, options) || {}
		assert.isUndefined(output[blockName], `output shouldn't contain ${blockName}`)
	})

	it(`output.${blockName} is object when {${blockName}: true}`, async () => {
		let options = {mergeOutput: false, [blockName]: true}
		let input = await getFile(filePath)
		let output = await parse(input, options) || {}
		testBlockResult(output, blockName, results)
	})

	if (enabledByDefault) {
		it(`output.${blockName} is object by default`, async () => {
			let options = {mergeOutput: false}
			let input = await getFile(filePath)
			let output = await parse(input, options) || {}
			testBlockResult(output, blockName, results)
		})
	} else {
		it(`output.${blockName} is undefined by default`, async () => {
			let options = {mergeOutput: false}
			let input = await getFile(filePath)
			let output = await parse(input, options) || {}
			assert.isUndefined(output[blockName], `output shouldn't contain ${blockName}`)
		})
	}

}

describe('TIFF Segment', () => {

	testSegment({
		key: 'tiff',
		fileWith: 'IMG_20180725_163423.jpg',
		fileWithout: 'noexif.jpg',
		definedByDefault: true,
	})

	describe('translation', () => {
		testTranslation('tiff', 'IMG_20180725_163423.jpg', [
			0xA408, 'Contrast',
			0, 'Normal',
		], [
			0x9207, 'MeteringMode',
			2, 'CenterWeightedAverage',
		], [
			0x0001, 'GPSLatitudeRef',
			'N',
			'N',
		])
	})

    /*
    import {TiffExifParser} from '../src/parsers/tiff'
    TiffExifParser

    // Exif is scattered throughout the file.
    // Header at the beginning of file, data at the end.
    // tiff offset at 0; ID0 offset at 677442
    it(`scattered file, read/fetch whole file - should succeed 1`, async () => {
        let options = {wholeFile: true}
        let input = getPath('001.tif')
        let output = await parse(input, options)
        assert.equal(output.Make, 'DJI')
    })

	*/

	describe('IFD0 / Image Block', () => {
		testBlock('ifd0', true, {
			Make: 'Google',
			Model: 'Pixel',
		})
	})

	describe('EXIF Block', () => {
		testBlock('exif', true, {
			ExposureTime: 0.000376
		})

		it(`additional EXIF block test`, async () => {
			let output = await parse(await getFile('img_1771.jpg'))
			assert.equal(output.ApertureValue, 4.65625)
		})
	})

	describe('GPS Block', () => {
		testBlock('gps', true, {
			GPSLatitudeRef: 'N',
			GPSLongitudeRef: 'E',
			GPSDOP: 18,
		})

		it(`additional GPS block test 1`, async () => {
			let output = await parse(await getFile('PANO_20180725_162444.jpg'), {mergeOutput: false})
			assert.equal(output.gps.GPSProcessingMethod, 'fused', `output doesn't contain gps`)
		})

		it(`additional GPS block test 2 (practical latitude & longitude in output)`, async () => {
			let output = await parse(await getFile('IMG_20180725_163423.jpg'), {mergeOutput: false})
			assert.equal(output.gps.latitude, 50.29960277777778)
			assert.equal(output.gps.longitude, 14.820294444444444)
		})
	})

	describe('Interop Block', () => {
		testBlock('interop', false, {
			InteropIndex: 'R98'
		})
	})

	// IFD1
	describe('IFD1 / Thumbnail', () => {
		testBlock('thumbnail', false, {
			ImageHeight: 189
		})
	})

	it(`should handle .tif with scattered TIFF (IFD0 pointing to the end of file)`, async () => {
		let input = await getFile('001.tif')
		let output = await parse(input)
		assert.equal(output.Make, 'DJI')
	})

	// TODO: more tests for .tif

})
