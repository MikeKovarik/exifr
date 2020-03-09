import {assert} from './test-util-core.mjs'
import {getPath, getFile} from './test-util-core.mjs'
import * as exifr from '../src/bundles/full.mjs'


function testFile(fileName, segmentsAndBlocks) {
	let options = {mergeOutput: false}
	for (let key of segmentsAndBlocks) {
		if (key === 'xmp')
			options[key] = {parse: false}
		else
			options[key] = true
	}

	it(`${fileName} - whole file`, async () => {
		let input = await getFile(fileName)
		let output = await exifr.parse(input, options)
		for (let key of segmentsAndBlocks)
			assert.exists(output[key], `should parse ${key}`)
	})

	it(`${fileName} - chunked mode`, async () => {
		let input = await getPath(fileName)
		let output = await exifr.parse(input, options)
		for (let key of segmentsAndBlocks)
			assert.exists(output[key], `should parse ${key}`)
	})

}

describe('basic fixture testing', () => {
	testFile('001.tif', ['ifd0', 'exif', 'gps', 'xmp'])
	testFile('002.tiff', ['ifd0', 'exif', 'gps', 'xmp'])
	testFile('BonTonARTSTORplusIPTC.jpg', ['ifd0', 'exif', 'ifd1', 'xmp', 'icc', 'iptc', 'jfif'])
	testFile('Bush-dog.jpg', ['ifd0', 'exif', 'ifd1', 'xmp', 'icc', 'iptc', 'jfif'])
	// broken1.jpg throws
	testFile('canon-dslr.jpg', ['ifd0', 'exif', 'interop', 'ifd1', 'xmp', 'makerNote'])
	testFile('cookiezen.jpg', ['xmp'])
	testFile('heic-collection.heic', []) // nothing in the file but it shouldnt fail
	testFile('heic-empty.heic', ['ifd0', 'icc'])
	testFile('heic-iphone.heic', ['ifd0', 'exif', 'gps', 'icc', 'makerNote'])
	testFile('heic-iphone7.heic', ['ifd0', 'exif', 'gps', 'icc', 'makerNote'])
	testFile('heic-maybebroken.HEIC', ['ifd0', 'exif', 'gps', 'icc', 'makerNote']) // TODO
	testFile('heic-single.heic', []) // nothing in the file but it shouldnt fail
	testFile('image9_14.jpg', ['jfif'])
	testFile('img_1771.jpg', ['ifd0', 'exif', 'interop', 'ifd1', 'jfif'])
	testFile('img_1771_no_exif.jpg', ['jfif'])
	testFile('IMG_20180725_163423.jpg', ['ifd0', 'exif', 'interop', 'ifd1', 'icc', 'jfif', 'makerNote'])
	testFile('iptc-agency-photographer-example.jpg', ['ifd0', 'exif', 'interop', 'ifd1', 'xmp', 'icc', 'iptc'])
	testFile('iptc-independent-photographer-example.jpg', ['ifd0', 'exif', 'ifd1', 'xmp', 'icc', 'iptc'])
	testFile('iptc-staff-photographer-example.jpg', ['ifd0', 'exif', 'ifd1', 'xmp', 'icc', 'iptc'])
	testFile('issue-exif-js-124.tiff', ['ifd0', 'exif', 'xmp'])
	testFile('issue-exifr-13.jpg', ['ifd0', 'exif', 'interop', 'ifd1', 'xmp', 'makerNote'])
	testFile('issue-exifr-3.jpg', ['ifd0', 'exif', 'ifd1', 'xmp', 'jfif'])
	testFile('issue-exifr-4.jpg', ['xmp', 'jfif'])
	testFile('issue-fast-exif-2.jpg', ['ifd0', 'exif', 'ifd1', 'xmp', 'icc', 'iptc', 'jfif'])
	testFile('issue-metadata-extractor-152.jpg', ['exif', 'xmp'])
	testFile('issue-metadata-extractor-152.tif', ['exif', 'xmp'])
	testFile('issue-metadata-extractor-65.jpg', ['ifd0', 'exif', 'ifd1', 'xmp', 'icc', 'iptc'])
	testFile('issue-node-exif-58.jpg', ['xmp'])
	testFile('noexif.jpg', ['jfif'])
	testFile('tif-with-iptc-icc-xmp.tif', ['ifd0', 'exif', 'xmp', 'icc', 'iptc'])
})