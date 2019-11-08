import {parse} from '../index.mjs'
import {assert} from './test-util.mjs'
import {getFile} from './test-util.mjs'
import IccParser from '../src/parsers/icc.mjs'


describe('ICC', () => {
/*
	describe('IccParser', () => {

		it(`parsing .icc fixture 1`, async () => {
			var buffer = await getFile('./fixtures/D65_XYZ.icc')
			var output = await IccParser.parse(buffer)
			console.log(output)
			assert.exists(output, `output is undefined`)
		})

	})
*/

	function testFile(filePath, results = {}) {
		it(`parsing icc from jpg ${filePath}`, async () => {
			var file = await getFile(filePath)
			var options = {mergeOutput: false, icc: true}
			var output = await parse(file, options)
			assert.exists(output.icc, `output is undefined`)
			//console.log(output.icc)
			for (let [key, val] of Object.entries(results)) {
				assert.equal(output.icc[key], val)
			}
		})
	}

	testFile('./IMG_20180725_163423.jpg', {
		cmm: undefined, // we intentionally do not include empty \u0000 values
		version: '4.0.0',
		intent: 'Perceptual',
		colorSpace: 'RGB',
		creator: 'GOOG',
	})

	testFile('./Bush-dog.jpg', {
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

	//testFile('./exifr-issue-13.jpg', {})

	testFile('./fast-exif-issue-2.jpg', {
		// TEXT tag
		copyright: 'Copyright (c) 1998 Hewlett-Packard C',
		// SIG tag
		technology: 'CRT',
		//
		conditionsDescription: 'Reference Viewing Condition in IEC61966-2.1',
	})
/*
	it(`output.icc is undefined if the file doesn't contain ICC`, async () => {
		var file = await getFile('./exifr-issue-13.jpg')
		var options = {mergeOutput: false, icc: true}
		var output = await parse(file, options)
		assert.isUndefined(output.icc)
	})
*/
})