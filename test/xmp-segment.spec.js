import {assert} from './test-util-core.js'
import {getFile, getPath} from './test-util-core.js'
import {testSegment} from './test-util-suites.js'
import * as exifr from '../src/bundle-full.js'
import {Exifr} from '../src/bundle-full.js'
import XmpParser from '../src/segment-parsers/xmp.js'


describe('XMP Segment', () => {

	describe('options.xmp enable/disable', () => {
        testSegment({
            key: 'xmp',
            fileWith: 'cookiezen.jpg',
            fileWithout: 'img_1771_no_exif.jpg',
            definedByDefault: false
        })
    })

	describe('options.mergeOutput', () => {

        it(`output.xmp is string when {xmp: true, mergeOutput: true}`, async () => {
            let options = {mergeOutput: true, xmp: true}
            let input = await getFile('cookiezen.jpg')
            let output = await exifr.parse(input, options) || {}
            assert.isString(output.xmp, `output doesn't contain xmp`)
        })

        it(`output.xmp is string when {xmp: true, mergeOutput: false}`, async () => {
            let options = {mergeOutput: false, xmp: true}
            let input = await getFile('cookiezen.jpg')
            let output = await exifr.parse(input, options) || {}
            assert.isString(output.xmp, `output doesn't contain xmp`)
        })

    })

    it(`should parse XMP independenly (even if the file doesn't have TIFF)`, async () => {
        let options = {mergeOutput: false, xmp: true, chunked: false}
        let input = getPath('issue-exifr-4.jpg')
        let output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
    })

	it(`should parse .tif file with scattered data segments when {xmp: true, tiff: true)`, async () => {
		let options = {mergeOutput: false, xmp: true, tiff: true}
		let input = await getFile('001.tif')
		var output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
	})

	it(`should parse .tif file with scattered data segments when {xmp: true, tiff: false)`, async () => {
		let options = {mergeOutput: false, xmp: true, tiff: false}
		let input = await getFile('001.tif')
		var output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
	})

    it(`issue exifr #4 whole file`, async () => {
		let input = await getFile('issue-exifr-4.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue exifr #4 chunked`, async () => {
		let input = getPath('issue-exifr-4.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue exifr #13 whole file`, async () => {
		let input = await getFile('issue-exifr-13.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue exifr #13 chunked`, async () => {
		let input = getPath('issue-exifr-13.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue node-exif #58 whole file`, async () => {
		let input = await getFile('issue-node-exif-58.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
    })

    it(`issue node-exif #58 chunked`, async () => {
		let input = getPath('issue-node-exif-58.jpg')
		let options = {mergeOutput: false, xmp: true}
        let output = await exifr.parse(input, options)
        assert.isNotEmpty(output.xmp, `output doesn't contain xmp`)
    })

	it(`should extract XMP from .tif file with scattered data segments when {tiff: true, xmp: true}`, async () => {
		let options = {tiff: true, xmp: true, mergeOutput: false}
		let input = await getFile('001.tif')
		var output = await exifr.parse(input, options)
		assert.isNotEmpty(output.xmp)
	})

	it(`should extract XMP from .tif file with scattered data segments when {tiff: false, xmp: true}`, async () => {
		let options = {tiff: false, xmp: true, mergeOutput: false}
		let input = await getFile('001.tif')
		var output = await exifr.parse(input, options)
		assert.isNotEmpty(output.xmp)
	})

	// this file was buggy and did not parse properly. do not remove this test.

	it(`should not be empty when the XMP string starts with '<?xpacket><rdf:RDF>'`, async () => {
		let options = {tiff: false, xmp: true, mergeOutput: false}
		let input = await getFile('issue-exif-js-124.tiff')
		var output = await exifr.parse(input, options)
		assert.isNotEmpty(output.xmp)
	})

	it(`should not be empty when the XMP string starts with '<x:xmpmeta><rdf:RDF>'`, async () => {
		let options = {tiff: false, xmp: true, mergeOutput: false}
		let input = await getFile('cookiezen.jpg')
		var output = await exifr.parse(input, options)
		assert.isNotEmpty(output.xmp)
	})

	it(`should not be empty when the XMP string starts with '<?xpacket><x:xmpmeta>'`, async () => {
		let options = {tiff: false, xmp: true, mergeOutput: false}
		let input = await getFile('cookiezen.jpg')
		var output = await exifr.parse(input, options)
		assert.isNotEmpty(output.xmp)
	})


	describe(`XMP Extended`, async () => {

		const options = {tiff: false, xmp: true, multiSegment: true}
		let input
		before(async () => input = await getFile('Google Cardboard (multi xmp).jpg'))

		it(`main chunk is extracted`, async () => {
			let exr = new Exifr(options)
			await exr.read(input)
			await exr.parse()
			let mainChunk = exr.fileParser.appSegments
				.filter(seg => seg.type === 'xmp')
				.find(seg => seg.extended === false)
			assert.isDefined(mainChunk)
		})

		it(`all extended chunks are extracted`, async () => {
			let exr = new Exifr(options)
			await exr.read(input)
			await exr.parse()
			let extendedChunks = exr.fileParser.appSegments
				.filter(seg => seg.type === 'xmp')
				.filter(seg => seg.extended === true)
			assert.lengthOf(extendedChunks, 45)
		})

		it(`main chunk data is extracted properly`, async () => {
			let exr = new Exifr(options)
			await exr.read(input)
			await exr.parse()
			let segStart = exr.fileParser.appSegments
				.filter(seg => seg.type === 'xmp')
				.find(seg => seg.extended === false)
				.chunk
				.getString()
			console.log('segStart', segStart)
			// rdf:Description opening
			assert.include(segStart, '<rdf:Description rdf:about=""')
			// first attribute
			assert.include(segStart, 'xmlns:GPano="http://ns.google.com/photos/1.0/panorama/"')
			// rdf:Description closing
			assert.include(segStart, 'xmpNote:HasExtendedXMP="5740B4AB4292ABB7BDCE0639415FA33F"/>', )
		})

		it(`extended XMP chunks are extracted properly (each chunk starts with data; chunk header is trimmed)`, async () => {
			let expectedSegStarts = [
				// first extended chunk (second, if the main is countet too)
				'<x:xm',
				// other chunks
				'7QEky', '/mKyw', 'oQwBY', 'RlZu3', '9rR2d', 'JQsfI', 'YHr7p', 'U92Ao', 'd5XXY', '9ZZ2P',
				'dD7se', 'FXvah', 'HbS9K', 'XS+pJ', 'jgiFO', 'Q0bdB', '5Pvrb', 'gIMhL', 'aeZ3E', 'dZepw',
				'1rbg3', 'gByRV', 'OilBW', 'p201J', 'LYCbc', 'Cy22i', 'Q0bzY', '96Lhd', 'JaMws', 'KH7pb',
				'n/AMM', 'Jh8fJ', 'LwhoL', 'hsj3v', 'gFAIo', 'vEIUv', 'S0tLS', '8Wq/F', 'g0MBx', 'd0+qK',
				'DhNPH', 'm218u', 'WWqwu', 'zZ966',
			]
			let exr = new Exifr(options)
			await exr.read(input)
			await exr.parse()
			console.log('exr.fileParser.appSegments', exr.fileParser.appSegments)
			let actualSegStarts = exr.fileParser.appSegments
				.filter(seg => seg.type === 'xmp')
				.filter(seg => seg.extended === true)
				.map(seg => seg.chunk)
				.map(bufferView => bufferView.getString(0, 5))
			assert.lengthOf(actualSegStarts, 45)
			for (let i = 0; i > actualSegStarts; i++) {
				let expected = expectedSegStarts[i]
				let actual   = actualSegStarts[i]
				assert.equal(actual, expected)
			}
		})

		it(`extended XMP chunks are merged properly`, async () => {
			let exr = new Exifr(options)
			await exr.read(input)
			await exr.parse()
			let xmpSegments = exr.fileParser.appSegments.filter(seg => seg.type === 'xmp')
			let extended = XmpParser.mergeExtendedChunks(xmpSegments)
			assert.isTrue(extended.startsWith('<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.1.0-jc003">'), 'should start with x:xmpmeta')
			assert.include(extended, 'xmlns:GImage="http://ns.google.com/photos/1.0/image/"')
			assert.include(extended, 'GImage:Data="/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAMCAggICAgICAgICA')
			assert.include(extended, 'pebnyHJPRQC6iMzP/Z"')
			assert.include(extended, 'GAudio:Data="AAAAGGZ0eXBtcDQyAAAAAGlzb21tcDQyAAbB621kY')
			assert.include(extended, 'AAABAAAAFHN0Y28AAAAAAAAAAQAAACA="/>')
			assert.equal(extended.slice(-13).trim(), '</x:xmpmeta>', 'should end with x:xmpmeta')
		})

		it(`XMP Extended`, async () => {
			var output = await exifr.parse(input, options)
			//console.log('output', output)
			assert.equal(true, false)
		})

		it(`the same properties with but in different namespaces do not overwrite each other`, async () => {
			var output = await exifr.parse(input, options)
			// This file's extended XMP contains two "data" attributes than can overwrite each other
			// GImage:Data="/9j/4AAQSkZJRgABAQ
			// GAudio:Data="AAAAGGZ0eXBtcDQyAA
			assert.equal(true, false)
		})

	})

})
