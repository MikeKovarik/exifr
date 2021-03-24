import {assert, isNode} from './test-util-core.mjs'
import {getFile} from './test-util-core.mjs'
import * as exifr from '../src/bundles/full.mjs'
import {testSegment, testMergeSegment, testImage, testImageFull} from './test-util-suites.mjs'


describe('PNG File format', () => {


	describe('IHDR Segment (IHDR Chunk)', () => {

		it(`IHDR should be parsed with default options`, async () => {
			let options = undefined
			let input = await getFile('png/IMG_20180725_163423-1.png')
			let output = await exifr.parse(input, options)
			assert.equal(output.ImageWidth, 40)
			assert.equal(output.BitDepth, 8)
		})

		it(`recovers from broken file (invalid crc) without crashing`, async () => {
			let options = undefined
			let input = await getFile('png/invalid-iCCP-missing-adler32-checksum.png')
			let output = await exifr.parse(input, options)
			assert.equal(output.ImageWidth, 460)
			// ICC from PNG is currently available only on Nodejs
			if (isNode) assert.isNotEmpty(output.errors)
		})

		describe('options.ihdr enable/disable', () => {
			testSegment({
				key: 'ihdr',
				fileWith: 'png/IMG_20180725_163423-1.png',
				definedByDefault: true,
			})
		})

		testMergeSegment({
			key: 'ihdr',
			file: 'png/IMG_20180725_163423-1.png',
			properties: ['ImageWidth', 'BitDepth', 'Interlace']
		})

		describe(`routine 'correctly parses all data' tests`, () => {

			testImage('ihdr', 'png/IMG_20180725_163423-1.png', {
				ImageWidth: 40,
				ImageHeight: 30,
				BitDepth: 8,
				//Interlace: 'Noninterlaced', // warning: translated value
			})

			testImageFull('png/IMG_20180725_163423-1.png', {
				ImageWidth: 40,
				ImageHeight: 30,
				BitDepth: 8,
				Filter: 'Adaptive', // warning: translated value
				Interlace: 'Noninterlaced', // warning: translated value
				// text name of ICCP chunk
				ProfileName: 'Photoshop ICC profile',
				// XMP
				CreatorTool:	'HDR+ 1.0.199571065z',
				// ICC
				//ProfileFileSignature: 'acsp',
				//ViewingCondIlluminantType: 'D50',
			})

			testImageFull('png/IMG_20180725_163423-2.png', {
				ImageWidth: 40,
				ImageHeight: 30,
				BitDepth: 8,
				// text chunk
				Software: 'Adobe ImageReady',
				// text name of ICCP chunk
				ProfileName: 'ICC profile',
				//ProfileName: 'ICC profile',
				// XMP
				CreatorTool: 'HDR+ 1.0.199571065z',
				format: 'image/png', // WARNING: yes, the key in XMP is lowercase
				// ICC
				//ProfileFileSignature: 'acsp',
				//DeviceManufacturer: 'Google',
				//ProfileConnectionSpace: 'XYZ',
			})

			if (isNode) {
				// with ICC
				testImageFull('png/IMG_20180725_163423-2.png', {
					ImageWidth: 40,
					ImageHeight: 30,
					BitDepth: 8,
					// text chunk
					Software: 'Adobe ImageReady',
					// text name of ICCP chunk
					ProfileName: 'ICC profile',
					//ProfileName: 'ICC profile',
					// XMP
					CreatorTool: 'HDR+ 1.0.199571065z',
					format: 'image/png', // WARNING: yes, the key in XMP is lowercase
					// ICC
					ProfileFileSignature: 'acsp',
					DeviceManufacturer: 'Google',
					ProfileConnectionSpace: 'XYZ',
				})
			}

		})

	})

	describe('TIFF Segment (eXIf Chunk)', () => {

		describe('IFD0 Block', () => {

			describe('options.ifd0 enable/disable', () => {
				testSegment({
					key: 'ifd0',
					fileWith: 'png/png_with_exif_and_gps.png',
					definedByDefault: true,
				})
			})

			testMergeSegment({
				key: 'ifd0',
				file: 'png/png_with_exif_and_gps.png',
				properties: ['Make', 'Model', 'Orientation']
			})

		})

		describe('GPS Block', () => {

			describe('options.gps enable/disable', () => {
				testSegment({
					key: 'gps',
					fileWith: 'png/png_with_exif_and_gps.png',
					definedByDefault: true,
				})
			})

			testMergeSegment({
				key: 'gps',
				file: 'png/png_with_exif_and_gps.png',
				properties: ['GPSLatitude', 'GPSLongitude', 'GPSAltitude']
			})

		})

	})

})