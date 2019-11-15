import {assert} from './test-util.js'
import {getFile, testSegment, testImage, testTranslation} from './test-util.js'
import {parse} from '../src/index-full.js'
import IccParser from '../src/parsers/icc.js'


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

	testSegment({
		key: 'icc',
		fileWith: 'IMG_20180725_163423.jpg',
		fileWithout: 'issue-exifr-3.jpg',
		definedByDefault: false
	})

	testTranslation('icc', 'Bush-dog.jpg', [
		80, 'creator',
		'HP', 'Hewlett-Packard',
	//], [
	//	12, 'deviceClass',
	//	'mntr', 'Monitor',
	], [
		40, 'platform',
		'MSFT', 'Microsoft',
	], [
		'cprt', 'copyright',
		'Copyright (c) 1998 Hewlett-Packard C',
		'Copyright (c) 1998 Hewlett-Packard C',
	])

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
	it(`multisegment ICC support`, async () => {
		var options = {mergeOutput: false, icc: true}
		var file = await getFile('./issue-metadata-extractor-65.jpg')
		var output = await parse(file, options)
		assert.isObject(output.icc)
		console.log(output.icc)
	})
	*/


	describe('IccParser class', () => {

		testProfile('D65_XYZ.icc', {
			cmm: 'none',
			version: '2.4.0',
			deviceClass: 'Monitor',
			colorSpace: 'RGB',
			connectionSpace: 'XYZ',
			//date: 2004-07-21T18:57:42.000Z,
			signature: 'acsp',
			manufacturer: 'none',
			model: 'none',
			intent: 'Relative Colorimetric',
			creator: 'none',
			description: 'D65 XYZ profile',
			modelDescription: 'IEC 61966-2-1 Default RGB Colour Space - sRGB',
			technology: 'CRT',
			conditionsDescription: 'Reference Viewing Condition in IEC 61966-2-1',
			copyright: 'Copyright Hewlett Packard'
		})

		testProfile('sRGB_IEC61966-2-1_black_scaled.icc', {
			version: '2.0.0',
			deviceClass: 'Monitor',
			colorSpace: 'RGB',
			connectionSpace: 'XYZ',
			//date: 2009-03-27T21:36:31.000Z,
			signature: 'acsp',
			intent: 'Perceptual',
			description: 'sRGB IEC61966-2-1 black scaled',
			modelDescription: 'IEC 61966-2-1 Default RGB Colour Space - sRGB',
			technology: 'CRT',
			conditionsDescription: 'Reference Viewing Condition in IEC 61966-2-1',
			copyright: 'Copyright International Color Consortium'
		})

		testProfile('sRGB_v4_ICC_preference.icc', {
			version: '4.2.0',
			deviceClass: 'Space',
			colorSpace: 'RGB',
			connectionSpace: 'Lab',
			//date: 2007-07-25T00:05:37.000Z,
			signature: 'acsp',
			intent: 'Perceptual',
			description: 'sRGB v4 ICC preference perceptual intent beta',
			rig0: 'prmg',
			copyright: 'Copyright 2007 International Color Consortium'
		})

		testProfile('sRGB2014.icc', {
			version: '2.0.0',
			deviceClass: 'Monitor',
			colorSpace: 'RGB',
			connectionSpace: 'XYZ',
			//date: 2015-02-15T00:00:00.000Z,
			signature: 'acsp',
			intent: 'Perceptual',
			description: 'sRGB2014',
			modelDescription: 'IEC 61966-2-1 Default RGB Colour Space - sRGB',
			technology: 'CRT',
			conditionsDescription: 'Reference Viewing Condition in IEC 61966-2-1',
			copyright: 'Copyright International Color Consortium'
		})

		testProfile('USWebCoatedSWOP.icc', {
			cmm: 'ADBE',
			version: '2.1.0',
			deviceClass: 'Printer',
			colorSpace: 'CMYK',
			connectionSpace: 'Lab',
			//date: 2000-07-26T05:41:53.000Z,
			signature: 'acsp',
			platform: 'Apple',
			manufacturer: 'Adobe',
			intent: 'Perceptual',
			creator: 'Adobe',
			description: 'U.S. Web Coated (SWOP) v2',
			copyright: 'Copyright 2000 Adobe Systems'
		})

	})

	testImage('icc', 'IMG_20180725_163423.jpg', {
		cmm: undefined, // we intentionally do not include empty \u0000 values
		version: '4.0.0',
		intent: 'Perceptual',
		colorSpace: 'RGB',
		creator: 'Google',
		description: 'sRGB IEC61966-2.1\u0000',
		copyright: 'Copyright (c) 2016 Google Inc.\u0000',
	})

	testImage('icc', 'Bush-dog.jpg', {
		version: '2.1.0',
		intent: 'Perceptual',
		cmm: 'Lino',
		deviceClass: 'Monitor',
		colorSpace: 'RGB',
		connectionSpace: 'XYZ',
		platform: 'Microsoft',
		manufacturer: 'IEC',
		model: 'sRGB',
		creator: 'Hewlett-Packard',
		copyright: 'Copyright (c) 1998 Hewlett-Packard C',
	})

	testImage('icc', 'issue-fast-exif-2.jpg', {
		// TEXT tag
		copyright: 'Copyright (c) 1998 Hewlett-Packard C',
		// SIG tag
		technology: 'CRT',
		//
		conditionsDescription: 'Reference Viewing Condition in IEC61966-2.1',
	})

})