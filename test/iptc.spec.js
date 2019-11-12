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

	testImage('iptc', 'iptc-agency-photographer-example.jpg', {})
	testImage('iptc', 'iptc-independent-photographer-example.jpg', {})
	testImage('iptc', 'iptc-staff-photographer-example.jpg', {})
	testImage('iptc', 'BonTonARTSTORplusIPTC.jpg', {})


	// https://www.iptc.org/std-dev/photometadata/examples/agency-photographer-example.jpg
	// https://www.iptc.org/std/photometadata/documentation/userguide/index.htm#!Documents/alandmarkimagebyanindependentphotographer.htm
	// https://www.iptc.org/std/photometadata/documentation/userguide/index.htm#!Documents/adocumentaryimagebyastaffphotographer1.htm
	// https://www.iptc.org/std/photometadata/documentation/userguide/index.htm#!Documents/aheritageartworkimagebyanagencyphotographer.htm
	// iptc-agency-photographer-example.jpg
	// iptc-independent-photographer-example.jpg
	// iptc-staff-photographer-example.jpg
	// http://metadatadeluxe.pbworks.com/w/page/20792260/Photoshop%20Panels%20-%20IPTC%20and%20ARTstor
	// BonTonARTSTORplusIPTC.jpg

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