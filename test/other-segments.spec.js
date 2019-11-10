import {assert} from './test-util.js'
import {getFile, getPath} from './test-util.js'
import {parse} from '../src/index-full.js'


describe('Segments', () => {

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

	it(`JFIF`, async () => {
		let options = {jfif: true, wholeFile: true, mergeOutput: false}
		let input = getPath('exifr-issue-4.jpg')
		let output = await parse(input, options)
		assert.isObject(output, `output is undefined`)
		assert.isObject(output.jfif, `output does not contain jfif`)
		assert.equal(output.jfif.Ydensity, 96)
		assert.equal(output.jfif.Xthumbnail, 0)
	})

/*
	// TODO
	it(`should only contain IPTC segment (as output.iptc) if only IPTC is forced`, async () => {
		let output = await parse(await getFile('Bush-dog.jpg'), {mergeOutput: false, iptc: true, exif: false}) // TODO: better options to forcce disable everything else
		console.log('output', output)
		assert.equal(output.exif, undefined, `output.exif shouldn't be included`)
		assert.exists(output.iptc, `output.iptc doesn't exist`)
	})
*/
	//it(`should contain ICC segment (as output.icc) if requested`, async () => {
	//	let output = await parse(await getFile('Bush-dog.jpg'), {mergeOutput: false, icc: true})
	//	assert.exists(output.icc)
	//})

})