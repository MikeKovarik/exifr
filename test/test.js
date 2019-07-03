var isBrowser = typeof navigator === 'object'
var isNode = typeof require === 'function' && !isBrowser

if (isBrowser) {
	mocha.setup('bdd')
	setTimeout(() => mocha.run(), 100)
	var ExifParser = window.exifr
} else {
	var chai = require('chai')
	var path = require('path')
	var fs = require('fs').promises
	var ExifParser = require('../index.js')
}
var assert = chai.assert




function createImg(url) {
	var img = document.createElement('img')
	img.src = url
	document.querySelector('#temp')
		.append(img)
	return img
}
/*
function createBufferOrArrayBuffer(url) {
	if (isNode)
		return fs.readFile(url)
	else
		return createArrayBuffer(url)
}
*/
function createArrayBuffer(url) {
	return fetch(url).then(res => res.arrayBuffer())
}

function createBlob(url) {
	return fetch(url).then(res => res.blob())
}

function getPath(filepath) {
	if (isNode)
		return path.join(__dirname, filepath)
	else
		return filepath
}

function getUrl(filepath) {
	return location.href
		.split('/')
		.slice(0, -1)
		.concat(filepath)
		.join('/')
		.replace(/\\/g, '/')
}

async function createObjectUrl(url) {
	return URL.createObjectURL(await createBlob(url))
}

async function createBase64Url(url) {
	if (isBrowser) {
		return new Promise(async (resolve, reject) => {
			var blob = await createBlob(url)
			var reader = new FileReader()
			reader.onloadend = () => resolve(reader.result)
			reader.onerror = reject
			reader.readAsDataURL(blob) 
		})
	} else if (isNode) {
		var buffer = await fs.readFile(url)
		return 'data:image/jpeg;base64,' + buffer.toString('base64')
	}
}


describe('reader (input formats)', () => {

	isNode && it('Buffer', async () => {
		var buffer = await fs.readFile(getPath('IMG_20180725_163423.jpg'))
		var exif = await ExifParser.parse(buffer)
		assert.exists(exif, `exif doesn't exist`)
	})

	isBrowser && it('ArrayBuffer', async () => {
		var arrayBuffer = await createArrayBuffer(getPath('IMG_20180725_163423.jpg'))
		var exif = await ExifParser.parse(arrayBuffer)
		assert.exists(exif, `exif doesn't exist`)
	})

	isBrowser && it('Blob', async () => {
		var blob = await createBlob(getPath('IMG_20180725_163423.jpg'))
		var exif = await ExifParser.parse(blob)
		assert.exists(exif, `exif doesn't exist`)
	})

	isNode && it('string file path', async () => {
		let path = getPath('IMG_20180725_163423.jpg')
		var exif = await ExifParser.parse(path)
		assert.exists(exif, `exif doesn't exist`)
	})

	isBrowser && it('string URL', async () => {
		let url = getUrl('IMG_20180725_163423.jpg')
		var exif = await ExifParser.parse(url)
		assert.exists(exif, `exif doesn't exist`)
	})

	isBrowser && it('Object URL', async () => {
		var blob = await createObjectUrl(getPath('IMG_20180725_163423.jpg'))
		var exif = await ExifParser.parse(blob)
		assert.exists(exif, `exif doesn't exist`)
	})

	it('base64 URL', async () => {
		var blob = await createBase64Url(getPath('IMG_20180725_163423.jpg'))
		var exif = await ExifParser.parse(blob)
		assert.exists(exif, `exif doesn't exist`)
	})

	isBrowser && it('<img> element with normal URL', async () => {
		var img = createImg(getPath('IMG_20180725_163423.jpg'))
		var exif = await ExifParser.parse(img)
		assert.exists(exif, `exif doesn't exist`)
	})

	isBrowser && it('<img> element with Object URL', async () => {
		var img = createImg(await createObjectUrl(getPath('IMG_20180725_163423.jpg')))
		var exif = await ExifParser.parse(img)
		assert.exists(exif, `exif doesn't exist`)
	})

	//isBrowser && it('<img> element with base64 URL', async () => {
	//	var img = createImg(await createBase64Url(getPath('IMG_20180725_163423.jpg')))
	//	await ExifParser.parse(img)
	//})



	// file with short exif where all segments are together at the
	// start of the file, within single chunk

	it('simple file, read/fetch whole file - should succeed', async () => {
		let options = {wholeFile: true}
		var exif = await ExifParser.parse(getPath('IMG_20180725_163423.jpg'), options)
		assert.equal(exif.Make, 'Google')
	})

	it('simple file, chunked mode, allow additional chunks - should succeed', async () => {
		let options = {wholeFile: undefined}
		var exif = await ExifParser.parse(getPath('IMG_20180725_163423.jpg'), options)
		assert.equal(exif.Make, 'Google')
	})

	it('simple file, chunked mode, no additional chunks - should succeed', async () => {
		let options = {wholeFile: false}
		var exif = await ExifParser.parse(getPath('IMG_20180725_163423.jpg'), options)
		assert.equal(exif.Make, 'Google')
	})

	// Exif is scattered throughout the file.
	// Header at the beginning of file, data at the end.
	// tiff offset at 0; ID0 offset at 677442

	it('scattered file, read/fetch whole file - should succeed', async () => {
		let options = {wholeFile: true}
		var exif = await ExifParser.parse(getPath('001.tif'), options)
		assert.equal(exif.Make, 'DJI')
	})

/*
TODO: rewrite chunked reader for 3.0.0
	it('scattered file, chunked mode, allow additional chunks - should succeed', async () => {
		let options = {wholeFile: undefined}
		var exif = await ExifParser.parse(getPath('001.tif'), options)
		assert.equal(exif.Make, 'DJI')
	})

	it('scattered file, chunked mode, no additional chunks - should fail', async () => {
		let options = {wholeFile: false}
		var exif = await ExifParser.parse(getPath('001.tif'), options)
		assert.equal(exif, undefined)
	})
*/

})



describe('parser (exif data)', () => {

	let buffers = {}

	before(async () => {
		let images = [
			'IMG_20180725_163423.jpg',
			'PANO_20180725_162444.jpg',
			'cookiezen.jpg',
			'Bush-dog.jpg',
			'img_1771.jpg',
			'img_1771_no_exif.jpg',
			'fast-exif-issue-2.jpg',
			'node-exif-issue-58.jpg',
			'001.tif',
			'002.tiff',
			'exif-js-issue-124.tiff',
			'noexif.jpg',
		]
		for (let name of images) {
			if (isNode)
				buffers[name] = await fs.readFile(getPath(name))
			else
				buffers[name] = await fetch(getPath(name)).then(res => res.arrayBuffer())
		}
	})

	it('should return undefined if no exif was found', async () => {
		var exif = await ExifParser.parse(buffers['img_1771_no_exif.jpg'])
		assert.equal(exif, undefined)
	})

	it(`should return undefined if no exif was found (internal .parse() method)`, async () => {
		let intput = buffers['noexif.jpg']
		let parser = new ExifParser()
		await parser.parse(intput)
		let exif = await parser.parse()
		assert.isUndefined(exif)
	})

	describe('TIFF Segment', () => {

		it('should contain IFD0 block (as exif.image)', async () => {
			var exif = await ExifParser.parse(buffers['IMG_20180725_163423.jpg'], {mergeOutput: false})
			assert.exists(exif, `exif doesn't exist`)
			assert.equal(exif.image.Make, 'Google')
			assert.equal(exif.image.Model, 'Pixel')
		})

		it('should contain Exif block (as exif.exif)', async () => {
			var exif = await ExifParser.parse(buffers['IMG_20180725_163423.jpg'], {mergeOutput: false})
			assert.exists(exif, `exif doesn't exist`)
			assert.equal(exif.exif.ExposureTime, 0.000376)
		})

		it('should contain GPS block (as exif.gps)', async () => {
			var exif = await ExifParser.parse(buffers['IMG_20180725_163423.jpg'], {mergeOutput: false})
			assert.exists(exif, `exif doesn't exist`)
			assert.equal(exif.gps.GPSLatitude.length, 3)
			assert.equal(exif.gps.GPSLongitude.length, 3)
		})

		it('should contain interop if requested', async () => {
			var exif = await ExifParser.parse(buffers['IMG_20180725_163423.jpg'], {mergeOutput: false, interop: true})
			assert.exists(exif, `exif doesn't exist`)
			assert.equal(exif.interop.InteropIndex, 'R98')
		})

		it('should contain thumbnail (IFD1) if requested', async () => {
			var exif = await ExifParser.parse(buffers['IMG_20180725_163423.jpg'], {mergeOutput: false, thumbnail: true})
			assert.exists(exif, `exif doesn't exist`)
			assert.equal(exif.thumbnail.ImageHeight, 189)
		})

		it('should contain GPS block (as exif.gps) and processing method', async () => {
			var exif = await ExifParser.parse(buffers['PANO_20180725_162444.jpg'], {mergeOutput: false})
			assert.exists(exif, `exif doesn't exist`)
			assert.equal(exif.gps.GPSProcessingMethod, 'fused', `exif doesn't contain gps`)
		})

		it('should contain Exif block (as exif.exif) if requested', async () => {
			var exif = await ExifParser.parse(buffers['img_1771.jpg'])
			assert.exists(exif, `exif doesn't exist`)
			assert.equal(exif.ApertureValue, 4.65625)
		})

	})

	describe('Other segments', () => {

		it('should contain XMP segment (if whole file buffer is provided and options.xmp is enabled)', async () => {
			var exif = await ExifParser.parse(buffers['cookiezen.jpg'], {mergeOutput: false, xmp: true})
			assert.exists(exif, `exif doesn't exist`)
			assert.typeOf(exif.xmp, 'string', `exif doesn't contain xmp`)
		})

		it('should contain IPTC segment (as exif.iptc) if requested', async () => {
			var exif = await ExifParser.parse(buffers['Bush-dog.jpg'], {mergeOutput: false, iptc: true})
			assert.exists(exif, `exif doesn't exist`)
			assert.typeOf(exif.iptc.caption, 'string')
			assert.equal(exif.iptc.credit, 'AP')
			assert.equal(exif.iptc.headline, 'BUSH')
		})

		//it('should contain ICC segment (as exif.icc) if requested', async () => {
		//	var exif = await ExifParser.parse(buffers['Bush-dog.jpg'], {mergeOutput: false, icc: true})
		//	assert.exists(exif.icc)
		//})

	})

	describe('output', () => {

		it('should merge all segments by default', async () => {
			var exif = await ExifParser.parse(buffers['IMG_20180725_163423.jpg'])
			assert.exists(exif, `exif doesn't exist`)
			assert.equal(exif.Make, 'Google')
			assert.equal(exif.ExposureTime, 0.000376)
			assert.equal(exif.GPSLongitude.length, 3)
		})

		it('should translate values to string by default', async () => {
			var exif = await ExifParser.parse(buffers['IMG_20180725_163423.jpg'])
			assert.exists(exif, `exif doesn't exist`)
			assert.equal(exif.Contrast, 'Normal')
			assert.equal(exif.MeteringMode, 'CenterWeightedAverage')
		})

		it('should not translate values to string if options.postProcess = false', async () => {
			var exif = await ExifParser.parse(buffers['IMG_20180725_163423.jpg'], {postProcess: false})
			assert.exists(exif, `exif doesn't exist`)
			assert.equal(exif.Contrast, 0)
			assert.equal(exif.MeteringMode, 2)
		})

		it('should revive dates as Date instance by default', async () => {
			var exif = await ExifParser.parse(buffers['IMG_20180725_163423.jpg'])
			assert.exists(exif, `exif doesn't exist`)
			assert.instanceOf(exif.DateTimeOriginal, Date)
		})

		it('should not revive dates as Date instance if options.postProcess = false', async () => {
			var exif = await ExifParser.parse(buffers['IMG_20180725_163423.jpg'], {postProcess: false})
			assert.exists(exif, `exif doesn't exist`)
			assert.equal(exif.DateTimeOriginal, '2018:07:25 16:34:23')
		})

	})

	describe('issues (special cases)', () => {

		it('#2 - 001.tif starting with 49 49', async () => {
			var exif = await ExifParser.parse(buffers['001.tif'])
			assert.exists(exif, `exif doesn't exist`)
			assert.equal(exif.Make, 'DJI')
			assert.equal(exif.ImageWidth, '640')
			//assert.equal(exif.ImageHeight, '512')
			assert.equal(exif.latitude, 50.86259891666667)
		})

		it('#2 - 002.tiff with value type 13 (IFD pointer) instead of 4', async () => {
			let options = {
				gps: true,
				mergeOutput: false,
			}
			var exif = await ExifParser.parse(buffers['002.tiff'], options)
			assert.exists(exif.gps)
		})

		it('fast-exif #2 - should not skip exif if 0xFF byte precedes marker', async () => {
			var exif = await ExifParser.parse(buffers['fast-exif-issue-2.jpg'], true)
			assert.exists(exif, `exif doesn't exist`)
			assert.equal(exif.ApertureValue, 5.655638)
			assert.equal(exif.LensModel, '24.0-70.0 mm f/2.8')
		})

		it('node-exif #58 - should properly detect EXIF', async () => {
			var exif = await ExifParser.parse(buffers['node-exif-issue-58.jpg'], true)
			assert.exists(exif, `exif doesn't exist`)
			assert.exists(exif.xmp)
		})

		it('exif-js #124', async () => {
			var exif = await ExifParser.parse(buffers['exif-js-issue-124.tiff'], true)
			assert.exists(exif, `exif doesn't exist`)
			assert.equal(exif.Make, 'FLIR')
		})

	})

	describe('thumbnail', () => {

		let options = {
			thumbnail: true,
			mergeOutput: false,
		}

		it('thumbnail() returns Buffer or ArrayBuffer of thumbnail', async () => {
			let intput = buffers['IMG_20180725_163423.jpg']
			let parser = new ExifParser(options)
			await parser.read(intput)
			var output = await parser.thumbnail()
			output = new Uint8Array(output)
			assert.equal(output[0], 0xff)
			assert.equal(output[1], 0xd8)
		})

		it('thumbnail() returns Buffer or ArrayBuffer of thumbnail (forced after with mergeOutput)', async () => {
			let intput = buffers['IMG_20180725_163423.jpg']
			let parser = new ExifParser(true)
			await parser.read(intput)
			var output = await parser.thumbnail()
			output = new Uint8Array(output)
			assert.equal(output[0], 0xff)
			assert.equal(output[1], 0xd8)
		})

		it('thumbnail() returns Buffer or ArrayBuffer of thumbnail (default)', async () => {
			let intput = buffers['IMG_20180725_163423.jpg']
			let parser = new ExifParser()
			await parser.read(intput)
			var output = await parser.thumbnail()
			output = new Uint8Array(output)
			assert.equal(output[0], 0xff)
			assert.equal(output[1], 0xd8)
		})

		it(`thumbnail() returns undefined if there's no thumbnail`, async () => {
			let intput = buffers['noexif.jpg']
			let parser = new ExifParser(options)
			await parser.read(intput)
			assert.isUndefined(await parser.thumbnail())
		})

		it('static thumbnail()', async () => {
			let intput = buffers['IMG_20180725_163423.jpg']
			var output = await ExifParser.thumbnail(intput, options)
			// Buffer in Node, ArrayBuffer in browser
			output = new Uint8Array(output)
			assert.equal(output[0], 0xff)
			assert.equal(output[1], 0xd8)
		})

		isBrowser && it('static thumbnailUrl()', async () => {
			let intput = buffers['IMG_20180725_163423.jpg']
			var url = await ExifParser.thumbnailUrl(intput, options)
			assert.typeOf(url, 'string')
		})

	})

})
