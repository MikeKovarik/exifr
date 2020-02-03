import {assert} from './test-util-core.js'
import {getFile} from './test-util-core.js'
import {testMergeSegment, testSegmentTranslation, testPickOrSkipTags} from './test-util-suites.js'
import {testGlobalFormatterInheritance, testTiffFormatterInheritance} from './test-util-suites.js'
import {TAG_XMP, TAG_IPTC, TAG_ICC} from '../src/tags.js'
import {Exifr} from '../src/bundle-full.js'
import * as exifr from '../src/bundle-full.js'


function testBlockResult(output, blockName, results = {}) {
	assert.isObject(output[blockName], `output.${blockName} is undefined`)
	for (let [key, val] of Object.entries(results)) {
		assert.equal(output[blockName][key], val)
	}
}

let allBlocks = ['ifd0', 'exif', 'gps', 'interop', 'thumbnail']

function testBlock({blockName, definedByDefault, results}) {
	let fileWith = 'IMG_20180725_163423.jpg'
	let fileWithout = 'noexif.jpg'

	describe(`options.${blockName} enable/disable`, () => {

		it(`output.${blockName} is undefined when {${blockName}: false}`, async () => {
			let options = {mergeOutput: false, [blockName]: false}
			let input = await getFile(fileWith)
			let output = await exifr.parse(input, options) || {}
			assert.isUndefined(output[blockName], `output shouldn't contain ${blockName}`)
		})

		it(`output.${blockName} is defined when {${blockName}: true, tiff: false}`, async () => {
			let options = {mergeOutput: false, [blockName]: true, tiff: false}
			let input = await getFile(fileWith)
			let output = await exifr.parse(input, options) || {}
			assert.exists(output[blockName], `output should contain ${blockName}`)
		})

		it(`output.${blockName} is the only defined block when {${blockName}: true, tiff: false}`, async () => {
			let options = {mergeOutput: false, [blockName]: true, tiff: false}
			let input = await getFile(fileWith)
			let output = await exifr.parse(input, options) || {}
			for (let key of allBlocks)
				if (key !== blockName)
					assert.isUndefined(output[key], `output should not contain ${key}, only ${blockName}`)
		})

		if (fileWithout) {
			it(`output.${blockName} is undefined if the file doesn't TIFF despite {${blockName}: false}`, async () => {
				var options = {mergeOutput: false, [blockName]: true}
				var file = await getFile(fileWithout)
				var output = await exifr.parse(file, options) || {}
				assert.isUndefined(output[blockName])
			})
			it(`output.${blockName} is undefined if the file doesn't TIFF despite {tiff: false}`, async () => {
				var options = {mergeOutput: false, tiff: true}
				var file = await getFile(fileWithout)
				var output = await exifr.parse(file, options) || {}
				assert.isUndefined(output[blockName])
			})
		}

		it(`output.${blockName} is object when {${blockName}: true}`, async () => {
			let options = {mergeOutput: false, [blockName]: true}
			let input = await getFile(fileWith)
			let output = await exifr.parse(input, options) || {}
			testBlockResult(output, blockName, results)
		})

		if (definedByDefault) {
			it(`output.${blockName} is object by default`, async () => {
				let options = {mergeOutput: false}
				let input = await getFile(fileWith)
				let output = await exifr.parse(input, options) || {}
				testBlockResult(output, blockName, results)
			})
		} else {
			it(`output.${blockName} is undefined by default`, async () => {
				let options = {mergeOutput: false}
				let input = await getFile(fileWith)
				let output = await exifr.parse(input, options) || {}
				assert.isUndefined(output[blockName], `output shouldn't contain ${blockName}`)
			})
		}

	})

}

function testFormatterInheritanceInTiffBlock(argument) {
	describe(`formatter inheritance`, () => {
		testGlobalFormatterInheritance(argument)
		testTiffFormatterInheritance(argument)
	})
}




describe('TIFF Segment', () => {

	it(`should handle .tif with scattered TIFF (IFD0 pointing to the end of file)`, async () => {
		let input = await getFile('001.tif')
		let output = await exifr.parse(input)
		assert.equal(output.Make, 'DJI')
	})

	it(`IFD0 is ignored and only sifted through for GPS IFD pointer when {ifd0: false, gps: true}`, async () => {
		let input = await getFile('issue-metadata-extractor-152.tif')
		let options = {mergeOutput: false, ifd0: false, gps: true}
		var output = await exifr.parse(input, options)
		assert.isUndefined(output.ifd0)
		//assert.isUndefined(output.ifd0.ImageWidth)
		//assert.isUndefined(output.ifd0.Make)
		assert.exists(output.gps)
		assert.exists(output.gps.GPSLatitude)
	})

	describe('random tests', () => {

		it(`random issue {ifd0: false, exif: false, gps: false, interop: false, thumbnail: true}`, async () => {
			let input = await getFile('canon-dslr.jpg')
			let options = {mergeOutput: false, ifd0: false, exif: false, gps: false, interop: false, thumbnail: true}
			var output = await exifr.parse(input, options)
			assert.isObject(output)
		})

		it(`empty spaces in string are trimmed`, async () => {
			let input = await getFile('empty-imagedesc-in-ifd0.jpg') // this file has some weird string values
			var output = await exifr.parse(input, {ifd0: true})
			assert.equal(output.ImageDescription, undefined)
		})

		it(`empty strings are left undefined`, async () => {
			let input = await getFile('empty-imagedesc-in-ifd0.jpg') // this file has some weird string values
			var output = await exifr.parse(input, {gps: true})
			assert.equal(output.GPSMapDatum, 'WGS-84')
		})

		it(`FileSource is unpacked to single value`, async () => {
			let input = await getFile('empty-imagedesc-in-ifd0.jpg')
			var output = await exifr.parse(input, {exif: true})
			assert.notInstanceOf(output.FileSource, Uint8Array)
		})

		it(`SceneType is unpacked to single value`, async () => {
			let input = await getFile('empty-imagedesc-in-ifd0.jpg')
			var output = await exifr.parse(input, {exif: true})
			assert.notInstanceOf(output.SceneType, Uint8Array)
		})

	})

	describe('options.tiff = true/false shortcut', () => {

		it(`{tiff: true} enables all TIFF blocks`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let options = {mergeOutput: false, tiff: true}
			var output = await exifr.parse(input, options)
			assert.isObject(output.ifd0)
			assert.isObject(output.exif)
			assert.isObject(output.gps)
			assert.isObject(output.interop)
			assert.isObject(output.thumbnail)
		})

		it(`{tiff: false} disables all TIFF blocks`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let options = {mergeOutput: false, tiff: false}
			var output = await exifr.parse(input, options) || {}
			assert.isUndefined(output.ifd0)
			assert.isUndefined(output.exif)
			assert.isUndefined(output.gps)
			assert.isUndefined(output.interop)
			assert.isUndefined(output.thumbnail)
		})

		it(`{tiff: false, makerNote: true} disables all TIFF blocks except for those needed to get MakerNote`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let options = {mergeOutput: false, tiff: false, makerNote: true}
			var output = await exifr.parse(input, options)
			assert.isUndefined(output.ifd0)
			assert.isUndefined(output.exif)
			assert.isUndefined(output.gps)
			assert.isUndefined(output.interop)
			assert.isUndefined(output.thumbnail)
			assert.exists(output.makerNote)
		})

		it(`{tiff: false, exif: true} disables all TIFF blocks except for EXIF`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let options = {mergeOutput: false, tiff: false, exif: true}
			var output = await exifr.parse(input, options)
			assert.isUndefined(output.ifd0)
			assert.isObject(output.exif)
			assert.isUndefined(output.gps)
			assert.isUndefined(output.interop)
			assert.isUndefined(output.thumbnail)
		})

		it(`{tiff: false, thumbnail: true} disables all TIFF blocks except for thumbnail`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let options = {mergeOutput: false, tiff: false, thumbnail: true}
			var output = await exifr.parse(input, options)
			assert.isUndefined(output.ifd0)
			assert.isUndefined(output.exif)
			assert.isUndefined(output.gps)
			assert.isUndefined(output.interop)
			assert.isObject(output.thumbnail)
		})

	})

	describe('notable tags', () => {

		it(`MakerNote is not parsed by default`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			var output = await exifr.parse(input)
			assert.isUndefined(output.makerNote, `output.makerNote should be undefined`)
			assert.isUndefined(output.MakerNote, `output.MakerNote should be undefined`)
		})

		it(`UserComment is not parsed by default`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			var output = await exifr.parse(input)
			assert.isUndefined(output.userComment, `output.userComment should be undefined`)
			assert.isUndefined(output.UserComment, `output.UserComment should be undefined`)
		})

	})

	describe('pick / skip', () => {

		it(`only ifd0 picks are present in output (local array shorthand form)`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let options = {mergeOutput: true, ifd0: ['Make'], exif: false, gps: false, interop: false}
			let output = await exifr.parse(input, options)
			assert.exists(output.Make)
			assert.lengthOf(Object.keys(output), 1)
		})

		it(`only ifd0 picks are present in output (tiff semi-global array form)`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let options = {mergeOutput: true, tiff: ['Make']}
			let output = await exifr.parse(input, options)
			assert.exists(output.Make)
			assert.lengthOf(Object.keys(output), 1)
		})

		it(`only ifd0 picks are present in output (global picks array form)`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let options = {mergeOutput: true, pick: ['Make']}
			let output = await exifr.parse(input, options)
			assert.exists(output.Make)
			assert.lengthOf(Object.keys(output), 1)
		})

		it(`only ifd0, exif & gps pick are present in output`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let options = {mergeOutput: true, ifd0: ['Make'], exif: ['ISO'], gps: ['GPSLatitude'], interop: false}
			let output = await exifr.parse(input, options)
			assert.exists(output.Make)
			assert.exists(output.ISO)
			assert.exists(output.GPSLatitude)
			assert.lengthOf(Object.keys(output), 3)
		})

		it(`only exif & gps pick are present in output`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let options = {mergeOutput: true, ifd0: false, exif: ['ISO'], gps: ['GPSLatitude'], interop: false}
			let output = await exifr.parse(input, options)
			assert.exists(output.ISO)
			assert.exists(output.GPSLatitude)
			assert.lengthOf(Object.keys(output), 2)
		})

		it(`only ifd0, exif, gps & interop pick are present in output`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let options = {mergeOutput: true, ifd0: ['Make'], exif: ['ISO'], gps: ['GPSLatitude'], interop: ['InteropIndex']}
			let output = await exifr.parse(input, options)
			assert.exists(output.Make)
			assert.exists(output.ISO)
			assert.exists(output.GPSLatitude)
			assert.exists(output.InteropIndex)
			assert.lengthOf(Object.keys(output), 4)
		})

		it(`only ifd0, exif, gps & interop blocks with picked tags are present in output`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let options = {mergeOutput: false, ifd0: ['Make'], exif: ['ISO'], gps: ['GPSLatitude'], interop: ['InteropIndex']}
			let output = await exifr.parse(input, options)
			assert.exists(output.ifd0)
			assert.exists(output.exif)
			assert.exists(output.gps)
			assert.exists(output.interop)
			assert.lengthOf(Object.keys(output.ifd0), 1)
			assert.lengthOf(Object.keys(output.exif), 1)
			assert.lengthOf(Object.keys(output.gps), 1)
			assert.lengthOf(Object.keys(output.interop), 1)
			assert.exists(output.ifd0.Make)
			assert.exists(output.exif.ISO)
			assert.exists(output.gps.GPSLatitude)
			assert.exists(output.interop.InteropIndex)
		})

		it(`does not contain exif, nor ifd0, but contains makerNote when {ifd0: false, exif: false, makerNote: true, mergeOutput: false}`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let options = {mergeOutput: false, ifd0: false, exif: false, gps: false, makerNote: true}
			let output = await exifr.parse(input, options)
			assert.isUndefined(output.exif)
			assert.exists(output.makerNote)
			assert.lengthOf(Object.keys(output), 1)
		})

		it(`does not contain exif, nor ifd0, but contains makerNote when {ifd0: false, exif: false, makerNote: true, mergeOutput: true}`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let options = {mergeOutput: true, ifd0: false, exif: false, gps: false, makerNote: true}
			let output = await exifr.parse(input, options)
			assert.isUndefined(output.exif)
			assert.exists(output.makerNote)
			assert.lengthOf(Object.keys(output), 1)
		})

		it(`options.thumbnail exists when {ifd0: false, exif: false, thumbnail: true}`, async () => {
			let input = await getFile('IMG_20180725_163423.jpg')
			let options = {mergeOutput: false, ifd0: false, exif: false, gps: false, interop: false, thumbnail: true}
			let output = await exifr.parse(input, options)
			assert.isObject(output.thumbnail)
			assert.lengthOf(Object.keys(output), 1)
		})

		it(`edge case with .tif file`, async () => {
			let file = await getFile('issue-metadata-extractor-152.tif')
			let options = {tiff: true, ifd0: true, translateKeys: false}
			let output = await exifr.parse(file, options)
			assert.exists(output[0xC68B])
		})

	})

	// TODO: more tests for .tif

	//import {TiffExifParser} from '../src/segment-parsers/tiff'
	//TiffExifParser
	// Exif is scattered throughout the file.
	// Header at the beginning of file, data at the end.
	// tiff offset at 0; ID0 offset at 677442
	//it(`scattered file, read/fetch whole file - should succeed 1`, async () => {
	//    let options = {chunked: false}
	//    let input = getPath('001.tif')
	//    let output = await exifr.parse(input, options)
	//    assert.equal(output.Make, 'DJI')
	//})

})


describe('TIFF - IFD0 / Image Block', () => {

	testBlock({
		blockName: 'ifd0',
		definedByDefault: true,
		results: {
			Make: 'Google',
			Model: 'Pixel',
		}
	})

	testMergeSegment({
		key: 'ifd0',
		file: 'IMG_20180725_163423.jpg',
		properties: ['Make', 'Model']
	})

	testPickOrSkipTags('ifd0', 'IMG_20180725_163423.jpg', ['Make'], ['Model'])

	testSegmentTranslation({
		type: 'ifd0',
		file: 'IMG_20180725_163423.jpg',
		tags: [[
			0x010F, 'Make',
		]]
	})

	testFormatterInheritanceInTiffBlock({
		type: 'ifd0',
		file: 'IMG_20180725_163423.jpg',
		keyCode: 0x0128,
		keyName: 'ResolutionUnit',
		valRaw: 2,
		valTranslated: 'inches',
	})

	describe('revive edge cases', () => {

		describe('0xC68B OriginalRawFileName', () => {

			const CODE = 0xC68B
			let reviveOptions   = {tiff: true, ifd0: true, translateKeys: false, reviveValues: true}
			let noReviveOptions = {tiff: true, ifd0: true, translateKeys: false, reviveValues: false}
			let file1
			let file2
			before(async () => {
				file1 = await getFile('issue-metadata-extractor-152.jpg')
				file2 = await getFile('issue-metadata-extractor-152.tif')
			})

			it(`string & {reviveValues: false} => string`, async () => {
				var output = await exifr.parse(file1, noReviveOptions)
				assert.isString(output[CODE])
			})

			it(`string & {reviveValues: true} => string`, async () => {
				var output = await exifr.parse(file1, reviveOptions)
				assert.isString(output[CODE])
			})

			it(`Uint8Array & {reviveValues: false} => Uint8Array`, async () => {
				var output = await exifr.parse(file2, noReviveOptions)
				assert.instanceOf(output[CODE], Uint8Array)
			})

			it(`Uint8Array & {reviveValues: true} => string`, async () => {
				var output = await exifr.parse(file2, reviveOptions)
				assert.isString(output[CODE])
			})

		})

	})

})


describe('TIFF - EXIF Block', () => {
	testBlock({
		blockName: 'exif',
		definedByDefault: true,
		results: {
			ExposureTime: 0.000376
		}
	})

	testMergeSegment({
		key: 'exif',
		file: 'IMG_20180725_163423.jpg',
		properties: ['ExposureTime', 'ISO']
	})

	testPickOrSkipTags('exif', 'IMG_20180725_163423.jpg', ['ExposureTime'], ['ISO'])

	testSegmentTranslation({
		type: 'exif',
		file: 'IMG_20180725_163423.jpg',
		tags: [[
			0x9207, 'MeteringMode',
			2, 'CenterWeightedAverage',
		]]
	})

	testFormatterInheritanceInTiffBlock({
		type: 'exif',
		file: 'IMG_20180725_163423.jpg',
		keyCode: 0x9207,
		keyName: 'MeteringMode',
		valRaw: 2,
		valTranslated: 'CenterWeightedAverage',
	})

	it(`additional EXIF block test`, async () => {
		let output = await exifr.parse(await getFile('img_1771.jpg'))
		assert.equal(output.ApertureValue, 4.65625)
	})
})


describe('TIFF - GPS Block', () => {

	testBlock({
		blockName: 'gps',
		definedByDefault: true,
		results: {
			GPSLatitudeRef: 'N',
			GPSLongitudeRef: 'E',
			GPSDOP: 18,
		}
	})

	testMergeSegment({
		key: 'gps',
		file: 'IMG_20180725_163423.jpg',
		properties: ['GPSLatitude', 'GPSDateStamp']
	})

	testPickOrSkipTags('gps', 'IMG_20180725_163423.jpg', ['GPSLatitude'], ['GPSDateStamp'])

	testSegmentTranslation({
		type: 'gps',
		file: 'IMG_20180725_163423.jpg',
		tags: [[
			0x0001, 'GPSLatitudeRef',
			'N',
		]]
	})

	testFormatterInheritanceInTiffBlock({
		type: 'gps',
		file: 'IMG_20180725_163423.jpg',
		keyCode: 0x0001,
		keyName: 'GPSLatitudeRef',
		valRaw: 'N',
	})

	it(`additional GPS block test 1`, async () => {
		let output = await exifr.parse(await getFile('PANO_20180714_121453.jpg'), {mergeOutput: false})
		assert.equal(output.gps.GPSProcessingMethod, 'fused', `output doesn't contain gps`)
	})

	it(`additional GPS block test 2 (practical latitude & longitude in output)`, async () => {
		let options = {mergeOutput: false}
		let output = await exifr.parse(await getFile('IMG_20180725_163423.jpg'), options)
		assert.equal(output.gps.latitude, 50.29960277777778)
		assert.equal(output.gps.longitude, 14.820294444444444)
	})
})


describe('TIFF - Interop Block', () => {

	testBlock({
		blockName: 'interop',
		definedByDefault: false,
		results: {
			InteropIndex: 'R98'
		}
	})

	testMergeSegment({
		key: 'interop',
		file: 'IMG_20180725_163423.jpg',
		properties: ['InteropIndex', 'InteropVersion']
	})

	testPickOrSkipTags('interop', 'IMG_20180725_163423.jpg', ['InteropIndex'], ['InteropVersion'])

	testSegmentTranslation({
		type: 'interop',
		file: 'IMG_20180725_163423.jpg',
		tags: [[
			0x0001, 'InteropIndex',
		]]
	})

	testFormatterInheritanceInTiffBlock({
		type: 'interop',
		file: 'IMG_20180725_163423.jpg',
		keyCode: 0x0001,
		keyName: 'InteropIndex',
	})

})


// IFD1
describe('TIFF - IFD1 / Thumbnail Block', () => {

	testBlock({
		blockName: 'thumbnail',
		definedByDefault: false,
		results: {
			ImageHeight: 189
		}
	})

	testMergeSegment({
		key: 'thumbnail',
		file: 'IMG_20180725_163423.jpg',
		properties: ['Orientation', 'ImageHeight']
	})

	testPickOrSkipTags('thumbnail', 'IMG_20180725_163423.jpg', ['Orientation'], ['ImageHeight'])

	testSegmentTranslation({
		type: 'thumbnail',
		file: 'IMG_20180725_163423.jpg',
		tags: [[
			0x0112, 'Orientation',
			1, 'Horizontal (normal)'
		]]
	})

})

describe('TIFF - Embedded XMP, ICC, IPTC in .tif files', () => {

	let input
	before(async () => input = await getFile('tif-with-iptc-icc-xmp.tif'))

	describeEmbeddedSegment('xmp', TAG_XMP)
	describeEmbeddedSegment('icc', TAG_ICC)
	describeEmbeddedSegment('iptc', TAG_IPTC)

	function describeEmbeddedSegment(segKey, TAG) {
		let uperKey = segKey.toUpperCase()

		describe(uperKey, () => {

			it(`extracts only ${uperKey} {tiff: false, ${segKey}: true}`, async () => {
				let options = {tiff: false, iptc: true, mergeOutput: false}
				var output = await exifr.parse(input, options)
				assert.isDefined(output.iptc)
				assert.lengthOf(Object.keys(output), 1)
			})

			it(`skips everything else than ${uperKey} in TIFF when {tiff: false, ${segKey}: true}`, async () => {
				let options = {tiff: false, [segKey]: true, mergeOutput: false}
				var exr = new Exifr(options)
				await exr.read(input)
				await exr.parse(input)
				assert.lengthOf(exr.options.ifd0.pick, 1)
				assert.include(exr.options.ifd0.pick, TAG)
				assert.isFalse(exr.options.exif.enabled)
			})

		})
	}

})