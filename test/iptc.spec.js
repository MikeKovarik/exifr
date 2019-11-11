import {assert} from './test-util.js'
import {getFile, testSegment, testImage} from './test-util.js'


describe('IPTC Segment', () => {

	testSegment({
		key: 'iptc',
		fileWith: 'Bush-dog.jpg',
		fileWithout: 'IMG_20180725_163423.jpg',
		definedByDefault: false
	})

	testImage('iptc', 'Bush-dog.jpg', {
		credit: 'AP',
		headline: 'BUSH',
	})

/*
	it(`IPTC - as output.iptc if requested with options.iptc`, async () => {
		let options = {mergeOutput: false, iptc: true, exif: false}
		let input = await getFile('Bush-dog.jpg')
		let output = await parse(input, options)
		assert.isObject(output, `output is undefined`)
		assert.isObject(output.iptc, `output does not contain iptc`)
		assert.typeOf(output.iptc.caption, 'string')
		assert.equal(output.iptc.credit, 'AP')
		assert.equal(output.iptc.headline, 'BUSH')
	})
*/

})