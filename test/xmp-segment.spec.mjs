import {assert} from './test-util-core.mjs'
import {getFile, getPath} from './test-util-core.mjs'
import {testSegment} from './test-util-suites.mjs'
import * as exifr from '../src/bundles/full.mjs'
import {Exifr} from '../src/bundles/full.mjs'
// FIXME: importing directly from src/ breaks bundle tests
import Xmp from '../src/segment-parsers/xmp.mjs'
import {BufferView} from '../src/util/BufferView.mjs'


describe('XMP Segment', () => {

	describe('options.xmp enable/disable', () => {
		testSegment({
			key: 'xmp',
			fileWith: 'cookiezen.jpg',
			fileWithout: 'img_1771_no_exif.jpg',
			definedByDefault: false
		})
	})

	it(`BufferView input is stringified`, async () => {
		let bufferView = new BufferView(new Uint8Array([97, 98, 99]))
		let xmpParser = new Xmp(bufferView)
		assert.isString(xmpParser.chunk)
	})

	describe('options.mergeOutput & output format', () => {

		async function testOptions(title, options, assertion) {
			if (options)
				title += ' when ' + JSON.stringify(options)
			else
				title += ' by default'
			it(title, async () => {
				let input = await getFile('BonTonARTSTORplusIPTC.jpg')
				let output = await exifr.parse(input, options) || {}
				assertion(output)
			})
		}

		const namespaces = ['xap', 'xapMM', 'dc', 'photoshop', 'Iptc4xmpCore']
		const randomXmpProps = ['NativeDigest', 'DocumentID', 'ARTstorClassification', 'CreatorContactInfo']
/*
		// TODO: rename segment.enabled to segment.extract and segment.parse
		testOptions(`output.xmp is undefined`, {xmp: {extract: false}}, output => {
			assert.isUndefined(output.xmp, `output.xmp shouldn't be extracted`)
		})
*/
		testOptions(`output.xmp is string`, {xmp: {parse: false}}, output => {
			assert.isString(output.xmp, `output.xmp shouldn't be parsed into object`)
			assert.include(output.xmp, '<rdf:Description')
		})

		testOptions(`output.xmp is undefined, xmp properties are merged to top level output`, {mergeOutput: true, xmp: true}, output => {
			assert.isUndefined(output.xmp, `output.xmp should be undefined`)
			for (let ns of namespaces)       assert.isUndefined(output[ns])
			for (let prop of randomXmpProps) assert.isDefined(output[prop])
		})

		testOptions(`output.xmp is undefined, xmp namespace objects are merged to top level output`, {mergeOutput: false, xmp: true}, output => {
			assert.isUndefined(output.xmp, `output.xmp should be undefined`)
			for (let ns of namespaces)       assert.isObject(output[ns])
			for (let prop of randomXmpProps) assert.isUndefined(output[prop])
		})

		it(`XMP TIFF namespace is integrated into IFD0`, async () => {
			let options = {mergeOutput: false, xmp: true}
			let input = await getFile('BonTonARTSTORplusIPTC.jpg')
			let output = await exifr.parse(input, options) || {}
			assert.isUndefined(output.xmp)
			assert.isUndefined(output.tiff)
			// data from TIFF segment, EXIF block
			assert.equal(output.ifd0.Artist, 'Allan Kohl')
			assert.equal(output.ifd0.Software, 'Adobe Photoshop CS2 Windows')
			// data from XMP segment, EXIF namespace
			assert.exists(output.ifd0.NativeDigest)
			assert.deepEqual(output.ifd0.BitsPerSample, [8, 8, 8])
			// WARNING: this file has Orientation and ResolutionUnit in both formats
	  		// -> ifd0.ResolutionUnit: 'inches'
	  		// -> xmp.tiff.ResolutionUnit: 2
	  		// -> ifd0.YResolution: 600
	  		// -> xmp.tiff.YResolution: "6000000/10000"
			// TODO: not important right now but should figure out the processing at some point.
		})

		it(`XMP EXIF namespace is integrated into EXIF block from TIFF segment`, async () => {
			let options = {mergeOutput: false, xmp: true}
			let input = await getFile('BonTonARTSTORplusIPTC.jpg')
			let output = await exifr.parse(input, options) || {}
			assert.isUndefined(output.xmp)
			// data from TIFF segment, EXIF block
			assert.equal(output.exif.ExifImageWidth, 300)
			assert.equal(output.exif.ExifImageHeight, 379)
			// data from XMP segment, EXIF namespace
			assert.equal(output.exif.PixelXDimension, 300)
			assert.equal(output.exif.PixelYDimension, 379)
		})

		it(`extracts GPano namespace from XMP`, async () => {
			let options = {xmp: true}
			let input = await getFile('issue-exifr-4.jpg')
			let output = await exifr.parse(input, options) || {}
			//assert.equal(output.GPano.ProjectionType, 'equirectangular')
			assert.equal(output.ProjectionType, 'equirectangular')
			assert.equal(output.FullPanoWidthPixels, 12866)
		})

	})

	describe(`XMP extraction from scattered TIFF`, async () => {

		it(`should extract XMP from .tif file with scattered data segments when {tiff: true}`, async () => {
			let options = {mergeOutput: false, xmp: {parse: false}, tiff: true}
			let input = await getPath('001.tif')
			var output = await exifr.parse(input, options)
			assert.isString(output.xmp)
		})

		it(`should extract XMP from .tif file with scattered data segments when {tiff: false}`, async () => {
			let options = {mergeOutput: false, xmp: {parse: false}, tiff: false}
			let input = await getPath('001.tif')
			var output = await exifr.parse(input, options)
			assert.isString(output.xmp)
		})

		it(`should parse 001.tif file with scattered data segments when {xmp: true, tiff: true)`, async () => {
			let options = {xmp: true, tiff: true}
			let input = await getFile('001.tif')
			var output = await exifr.parse(input, options)
			assert.equal(output.TlinearGain, 0.04)
			assert.equal(output.FlightPitchDegree, 6)
		})

		it(`should parse 002.tiff file with scattered data segments when {xmp: true, tiff: false)`, async () => {
			let options = {xmp: true, tiff: false}
			let input = await getFile('002.tiff')
			var output = await exifr.parse(input, options)
			assert.equal(output.BandName, "LWIR")
			assert.equal(output.FlightRollDegree, -8.8)
		})

	})

	describe(`real world files, issues and edge cases`, async () => {

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

	})

	// this file was buggy and did not parse properly. do not remove this test.

	describe(`should parse with any kind of encapsulation`, async () => {

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

	})


	describe(`XMP Extended`, async () => {

		const options = {tiff: false, xmp: true, multiSegment: true}
		let input
		before(async () => input = await getFile('xmp - multisegment pano with vr.jpg'))

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
			let mergedXmpSegment = exr.fileParser.mergedAppSegments.find(seg => seg.type === 'xmp')
			let extended = mergedXmpSegment.chunk
			assert.include(extended, 'xmlns:GImage="http://ns.google.com/photos/1.0/image/"')
			assert.include(extended, 'GImage:Data="/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAMCAggICAgICAgICA')
			assert.include(extended, 'pebnyHJPRQC6iMzP/Z"')
			assert.include(extended, 'GAudio:Data="AAAAGGZ0eXBtcDQyAAAAAGlzb21tcDQyAAbB621kY')
			assert.include(extended, 'AAABAAAAFHN0Y28AAAAAAAAAAQAAACA="/>')
			assert.equal(extended.slice(-13).trim(), '</x:xmpmeta>', 'should end with x:xmpmeta')
		})

		it(`XMP Extended is not parsed when {xmp: true, multiSegment: false}`, async () => {
			let input = await getFile('xmp - multisegment pano with vr.jpg')
			const options = {tiff: false, xmp: true, multiSegment: false, mergeOutput: false}
			var output = await exifr.parse(input, options)
			// Basic XMP
			assert.isObject(output.GImage)
			assert.isString(output.GImage.Mime)
			assert.isString(output.xmpNote.HasExtendedXMP)
			// Par of extended XMP
			assert.isUndefined(output.GImage.Data)
		})

		it(`XMP Extended is parsed when {xmp: true, multiSegment: true}`, async () => {
			let input = await getFile('xmp - multisegment pano with vr.jpg')
			const options = {tiff: false, xmp: true, multiSegment: true, mergeOutput: false}
			var output = await exifr.parse(input, options)
			assert.equal(output.GImage.Data.slice(0, 8), '/9j/4AAQ')
			assert.equal(output.GImage.Data.slice(-8),   'C6iMzP/Z')
			assert.equal(output.GAudio.Data.slice(0, 8), 'AAAAGGZ0')
			assert.equal(output.GAudio.Data.slice(-8),   'AQAAACA=')
		})

		it(`XMP Extended is parsed when {xmp: {multiSegment: true}}`, async () => {
			let input = await getFile('xmp - multisegment pano with vr.jpg')
			const options = {tiff: false, xmp: {multiSegment: true}, mergeOutput: false}
			var output = await exifr.parse(input, options)
			assert.equal(output.GImage.Data.slice(0, 8), '/9j/4AAQ')
			assert.equal(output.GImage.Data.slice(-8),   'C6iMzP/Z')
			assert.equal(output.GAudio.Data.slice(0, 8), 'AAAAGGZ0')
			assert.equal(output.GAudio.Data.slice(-8),   'AQAAACA=')
		})

	})

})
