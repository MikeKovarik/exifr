import {assert} from './test-util.js'
import {getFile, testSegment, testImage} from './test-util.js'


describe('JFIF Segment', () => {

	describe('enable/disable in options', () => {
		testSegment({
			key: 'jfif',
			fileWith: 'issue-exifr-4.jpg',
			fileWithout: undefined,
			definedByDefault: false
		})
	})

	testImage('jfif', 'issue-exifr-4.jpg', {
		Ydensity: 96,
		Xthumbnail: 0,
	})

/*
	it(`JFIF`, async () => {
		let options = {jfif: true, wholeFile: true, mergeOutput: false}
		let input = getPath('issue-exifr-4.jpg')
		let output = await Exifr.parse(input, options)
		assert.isObject(output, `output is undefined`)
		assert.isObject(output.jfif, `output does not contain jfif`)
		assert.equal(output.jfif.Ydensity, 96)
		assert.equal(output.jfif.Xthumbnail, 0)
	})
*/

})