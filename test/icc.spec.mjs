import {assert, assertOutputWithoutErrors} from './test-util-core.mjs'
import {getFile} from './test-util-core.mjs'
import {testSegment, testMergeSegment, testSegmentTranslation, testImage} from './test-util-suites.mjs'
import IccParser from '../src/segment-parsers/icc.mjs'
import * as exifr from '../src/bundles/full.mjs'


function testProfile(filePath, results = {}) {
	it(`parsing .icc fixture ${filePath}`, async () => {
		var buffer = await getFile(filePath)
		var output = await IccParser.parse(buffer)
		assertOutputWithoutErrors(output)
		for (let [key, val] of Object.entries(results)) {
			assert.equal(output[key], val)
		}
	})
}

describe('ICC Segment', () => {

	describe('options.icc enable/disable', () => {
		testSegment({
			key: 'icc',
			fileWith: 'IMG_20180725_163423.jpg',
			fileWithout: 'issue-exifr-3.jpg',
			definedByDefault: false
		})
	})

	testMergeSegment({
		key: 'icc',
		file: 'IMG_20180725_163423.jpg',
		properties: ['ColorSpaceData', 'ProfileCreator']
	})

	// we won't bother implementing this for now. its way to insignificant of a use.
	//testPickOrSkipTags('icc', 'Bush-dog.jpg', [80, 'cprt', 'description'], [12, 'cmm', 'copyright'])

	testSegmentTranslation({
		type: 'icc',
		file: 'Bush-dog.jpg',
		tags: [
			[
				80, 'ProfileCreator',
				'HP', 'Hewlett-Packard',
			], [
				12, 'ProfileClass',
				'mntr', 'Monitor',
			], [
				40, 'PrimaryPlatform',
				'MSFT', 'Microsoft',
			], [
				'cprt', 'ProfileCopyright',
				'Copyright (c) 1998 Hewlett-Packard Company',
			]
		]
	})


	/*
	√ xmp      | offset   10595 | length    3554 | end   14149 | <Buffer ff e1 0d e0 68 74 74 70 3a 2f 2f 6e 73 2e>
	√ icc      | offset   14149 | length   65508 | end   79657 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset   79657 | length   65508 | end  145165 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset  145165 | length   65508 | end  210673 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset  210673 | length   65508 | end  276181 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset  276181 | length   65508 | end  341689 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset  341689 | length   65508 | end  407197 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset  407197 | length   65508 | end  472705 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset  472705 | length   65508 | end  538213 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
	√ icc      | offset  538213 | length   33266 | end  571479 | <Buffer ff e2 81 f0 49 43 43 5f 50 52 4f 46 49 4c>
	*/
	it(`should parse all segments of multisegment ICC .jpg file when {icc: {multiSegment: true}}`, async () => {
		let input = await getFile('issue-metadata-extractor-65.jpg')
		let options = {tiff: false, icc: {multiSegment: true}}
		let icc = await exifr.parse(input, options)
		assert.lengthOf(icc.MediaWhitePoint, 20)
		assert.lengthOf(icc.A2B0, 41478)
		assert.lengthOf(icc.A2B2, 41478)
		assert.lengthOf(icc.A2B1, 41478)
		assert.lengthOf(icc.B2A0, 145588)
		assert.lengthOf(icc.B2A1, 145588)
		assert.lengthOf(icc.B2A2, 145588)
		assert.lengthOf(icc.Gamut, 37009)
	})


	describe('IccParser class', () => {

		testProfile('D65_XYZ.icc', {
			ProfileCMMType: 'none',
			ProfileVersion: '2.4.0',
			ProfileClass: 'Monitor',
			ColorSpaceData: 'RGB',
			ProfileConnectionSpace: 'XYZ',
			//ProfileDateTime: 2004-07-21T18:57:42.000Z,
			ProfileFileSignature: 'acsp',
			DeviceManufacturer: 'none',
			DeviceModel: 'none',
			RenderingIntent: 'Relative Colorimetric',
			ProfileCreator: 'none',
			ProfileDescription: 'D65 XYZ profile',
			DeviceModelDesc: 'IEC 61966-2-1 Default RGB Colour Space - sRGB',
			Technology: 'Cathode Ray Tube Display',
			ViewingCondDesc: 'Reference Viewing Condition in IEC 61966-2-1',
			ProfileCopyright: 'Copyright Hewlett Packard, 2004'
		})

		testProfile('sRGB_IEC61966-2-1_black_scaled.icc', {
			ProfileVersion: '2.0.0',
			ProfileClass: 'Monitor',
			ColorSpaceData: 'RGB',
			ProfileConnectionSpace: 'XYZ',
			//ProfileDateTime: 2009-03-27T21:36:31.000Z,
			ProfileFileSignature: 'acsp',
			RenderingIntent: 'Perceptual',
			ProfileDescription: 'sRGB IEC61966-2-1 black scaled',
			DeviceModelDesc: 'IEC 61966-2-1 Default RGB Colour Space - sRGB',
			Technology: 'Cathode Ray Tube Display',
			ViewingCondDesc: 'Reference Viewing Condition in IEC 61966-2-1',
			ProfileCopyright: 'Copyright International Color Consortium, 2009'
		})

		testProfile('sRGB_v4_ICC_preference.icc', {
			ProfileVersion: '4.2.0',
			ProfileClass: 'Color Space Conversion Profile',
			ColorSpaceData: 'RGB',
			ProfileConnectionSpace: 'Lab',
			//ProfileDateTime: 2007-07-25T00:05:37.000Z,
			ProfileFileSignature: 'acsp',
			RenderingIntent: 'Perceptual',
			ProfileDescription: 'sRGB v4 ICC preference perceptual intent beta',
			PerceptualRenderingIntentGamut: 'prmg',
			ProfileCopyright: 'Copyright 2007 International Color Consortium'
		})

		testProfile('sRGB2014.icc', {
			ProfileVersion: '2.0.0',
			ProfileClass: 'Monitor',
			ColorSpaceData: 'RGB',
			ProfileConnectionSpace: 'XYZ',
			//ProfileDateTime: 2015-02-15T00:00:00.000Z,
			ProfileFileSignature: 'acsp',
			RenderingIntent: 'Perceptual',
			ProfileDescription: 'sRGB2014',
			DeviceModelDesc: 'IEC 61966-2-1 Default RGB Colour Space - sRGB',
			Technology: 'Cathode Ray Tube Display',
			ViewingCondDesc: 'Reference Viewing Condition in IEC 61966-2-1',
			ProfileCopyright: 'Copyright International Color Consortium, 2015'
		})

		testProfile('USWebCoatedSWOP.icc', {
			ProfileCMMType: 'Adobe',
			ProfileVersion: '2.1.0',
			ProfileClass: 'Printer',
			ColorSpaceData: 'CMYK',
			ProfileConnectionSpace: 'Lab',
			//ProfileDateTime: 2000-07-26T05:41:53.000Z,
			ProfileFileSignature: 'acsp',
			PrimaryPlatform: 'Apple Computer',
			DeviceManufacturer: 'Adobe',
			RenderingIntent: 'Perceptual',
			ProfileCreator: 'Adobe',
			ProfileDescription: 'U.S. Web Coated (SWOP) v2',
			ProfileCopyright: 'Copyright 2000 Adobe Systems, Inc.'
		})

	})

	testImage('icc', 'issue-fast-exif-2.jpg', {
		// TEXT tag
		ProfileCopyright: 'Copyright (c) 1998 Hewlett-Packard Company',
		// SIG tag
		Technology: 'Cathode Ray Tube Display',
		// ???
		ViewingCondDesc: 'Reference Viewing Condition in IEC61966-2.1',
	})

	testImage('icc', 'IMG_20180725_163423.jpg', {
		ProfileCMMType: undefined, // we intentionally do not include empty \u0000 values
		ProfileVersion: '4.0.0',
		ProfileClass: 'Monitor',
		ColorSpaceData: 'RGB',
		ProfileConnectionSpace: 'XYZ',
		//ProfileDateTime: 2016-12-08T09:38:28.000Z,
		ProfileFileSignature: 'acsp',
		DeviceManufacturer: 'Google',
		RenderingIntent: 'Perceptual',
		ProfileCreator: 'Google',
		ProfileDescription: 'sRGB IEC61966-2.1',
		ProfileCopyright: 'Copyright (c) 2016 Google Inc.'
	})

	testImage('icc', 'Bush-dog.jpg', {
		ProfileCMMType: 'Linotronic',
		ProfileVersion: '2.1.0',
		ProfileClass: 'Monitor',
		ColorSpaceData: 'RGB',
		ProfileConnectionSpace: 'XYZ',
		//ProfileDateTime: 1998-02-09T06:49:00.000Z,
		ProfileFileSignature: 'acsp',
		PrimaryPlatform: 'Microsoft',
		DeviceManufacturer: 'Hewlett-Packard',
		DeviceModel: 'sRGB',
		RenderingIntent: 'Perceptual',
		ProfileCreator: 'Hewlett-Packard',
		ProfileCopyright: 'Copyright (c) 1998 Hewlett-Packard Company',
		ProfileDescription: 'sRGB IEC61966-2.1',
		DeviceMfgDesc: 'IEC http://www.iec.ch',
		DeviceModelDesc: 'IEC 61966-2.1 Default RGB colour space - sRGB',
		ViewingCondDesc: 'Reference Viewing Condition in IEC61966-2.1',
		Technology: 'Cathode Ray Tube Display'
	})

	testImage('icc', 'tif-with-iptc-icc-xmp.tif', {
		ProfileCMMType: 'KCMS',
		ProfileVersion: '2.1.0',
		ProfileClass: 'Monitor',
		ColorSpaceData: 'RGB',
		ProfileConnectionSpace: 'XYZ',
		//ProfileDateTime: '1998-12-01T18:58:21.000Z',
		ProfileFileSignature: 'acsp',
		PrimaryPlatform: 'Microsoft',
		DeviceManufacturer: 'Kodak',
		DeviceModel: 'ROMM',
		RenderingIntent: 'Perceptual',
		ProfileCreator: 'Kodak',
		ProfileCopyright: 'Copyright (c) Eastman Kodak Company, 1999, all rights reserved.',
		ProfileDescription: 'ProPhoto RGB',
		DeviceMfgDesc: 'KODAK',
		DeviceModelDesc: 'Reference Output Medium Metric(ROMM)'
	})

})