import {assert} from './test-util.js'
import {getFile, testSegment, testSegmentTranslation, testImage} from './test-util.js'
import IccParser from '../src/segment-parsers/icc.js'


function testProfile(filePath, results = {}) {
	it(`parsing .icc fixture ${filePath}`, async () => {
		var buffer = await getFile(filePath)
		var output = await IccParser.parse(buffer)
		assert.exists(output, `output is undefined`)
		for (let [key, val] of Object.entries(results)) {
			assert.equal(output[key], val)
		}
	})
}

describe('ICC Segment', () => {

	describe('enable/disable in options', () => {
		testSegment({
			key: 'icc',
			fileWith: 'IMG_20180725_163423.jpg',
			fileWithout: 'issue-exifr-3.jpg',
			definedByDefault: false
		})
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
				'Copyright (c) 1998 Hewlett-Packard C',
			]
		]
	})

	/*
	// https://github.com/drewnoakes/metadata-extractor/issues/65
	NOTE: this file has multiple ICC segments but even other parsers dont seem to extract useful data from them.
	the chunks are as follows
	[
		{offset: 14167, length: 65490, chunkNumber: 1},
		{offset: 79675, length: 65490, chunkNumber: 2},
		{offset: 145183, length: 65490, chunkNumber: 3},
		{offset: 210691, length: 65490, chunkNumber: 4},
		{offset: 276199, length: 65490, chunkNumber: 5},
		{offset: 341707, length: 65490, chunkNumber: 6},
		{offset: 407215, length: 65490, chunkNumber: 7},
		{offset: 472723, length: 65490, chunkNumber: 8},
		{offset: 538231, length: 33248, chunkNumber: 9}
	]
	it(`multipage ICC support`, async () => {
		var options = {mergeOutput: false, icc: true}
		var file = await getFile('./issue-metadata-extractor-65.jpg')
		var output = await Exifr.parse(file, options)
		assert.isObject(output.icc)
		console.log(output.icc)
	})
	*/


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
			ProfileCopyright: 'Copyright Hewlett Packard'
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
			ProfileCopyright: 'Copyright International Color Consortium'
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
			ProfileCopyright: 'Copyright International Color Consortium'
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
			ProfileCopyright: 'Copyright 2000 Adobe Systems'
		})

	})

	testImage('icc', 'issue-fast-exif-2.jpg', {
		// TEXT tag
		ProfileCopyright: 'Copyright (c) 1998 Hewlett-Packard C',
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
		ProfileDescription: 'sRGB IEC61966-2.1\u0000',
		ProfileCopyright: 'Copyright (c) 2016 Google Inc.\u0000'
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
		ProfileCopyright: 'Copyright (c) 1998 Hewlett-Packard C',
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
		ProfileCopyright: 'Copyright (c) Eastman Kodak Company, 1999, all rights res',
		ProfileDescription: 'ProPhoto RGB',
		DeviceMfgDesc: 'KODAK',
		DeviceModelDesc: 'Reference Output Medium Metric(ROMM)'
	})

})