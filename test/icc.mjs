import {parse} from '../index.mjs'
import {assert} from './test-util.mjs'
import {getFile} from './test-util.mjs'
import IccParser from '../src/parsers/icc.mjs'


function testImage(filePath, results = {}) {
	it(`parsing icc from jpg ${filePath}`, async () => {
		var file = await getFile(filePath)
		var options = {mergeOutput: false, icc: true}
		var output = await parse(file, options)
		assert.exists(output.icc, `output is undefined`)
		for (let [key, val] of Object.entries(results)) {
			assert.equal(output.icc[key], val)
		}
	})
}

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

describe('ICC', () => {

	it(`output.icc is undefined by default`, async () => {
		var options = {mergeOutput: false}
		var file = await getFile('./exifr-issue-13.jpg')
		var output = await parse(file, options)
		assert.isUndefined(output.icc)
	})

	it(`output.icc is undefined when {icc: false}`, async () => {
		var options = {mergeOutput: false, icc: false}
		var file = await getFile('./exifr-issue-13.jpg')
		var output = await parse(file, options)
		assert.isUndefined(output.icc)
	})

	it(`output.icc is object when {icc: true}`, async () => {
		var options = {mergeOutput: false, icc: true}
		var file = await getFile('./IMG_20180725_163423.jpg')
		var output = await parse(file, options)
		assert.isObject(output.icc)
	})

	it(`output.icc is undefined if the file doesn't contain ICC`, async () => {
		var options = {mergeOutput: false, icc: true}
		var file = await getFile('./exifr-issue-3.jpg')
		var output = await parse(file, options)
		assert.isUndefined(output.icc)
	})


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

	testImage('IMG_20180725_163423.jpg', {
		cmm: undefined, // we intentionally do not include empty \u0000 values
		version: '4.0.0',
		intent: 'Perceptual',
		colorSpace: 'RGB',
		creator: 'Google',
		description: 'sRGB IEC61966-2.1\u0000',
		copyright: 'Copyright (c) 2016 Google Inc.\u0000',
	})

	testImage('Bush-dog.jpg', {
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

	testImage('fast-exif-issue-2.jpg', {
		// TEXT tag
		copyright: 'Copyright (c) 1998 Hewlett-Packard C',
		// SIG tag
		technology: 'CRT',
		//
		conditionsDescription: 'Reference Viewing Condition in IEC61966-2.1',
	})

})