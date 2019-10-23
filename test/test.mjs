	import chai from 'chai'
	import path from 'path'
	import {promises as fs} from 'fs'
var isBrowser = typeof navigator === 'object'
var isNode = typeof process === 'object' && process.versions && process.versions.node

if (isBrowser) {
	mocha.setup('bdd')
	setTimeout(() => mocha.run(), 100)
} else {
}
import {ExifParser, parse, thumbnailBuffer, thumbnailUrl} from '../index.mjs'
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

if (isNode) {
	if (typeof __dirname !== 'undefined')
		var dirname = __dirname
	else
		var dirname = path.dirname(import.meta.url.replace('file:///', ''))
}

function getPath(filepath) {
	if (isNode)
		return path.join(dirname, filepath)
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

function createWorker(input) {
	return new Promise((resolve, reject) => {
		let worker = new Worker('worker.js')
		worker.postMessage(input)
		worker.onmessage = e => resolve(e.data)
		worker.onerror = reject
	})
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

	isNode && it(`Node: Buffer`, async () => {
		var buffer = await fs.readFile(getPath('IMG_20180725_163423.jpg'))
		var output = await parse(buffer)
		assert.exists(output, `output is undefined`)
	})

	isBrowser && it(`Browser: ArrayBuffer`, async () => {
		var arrayBuffer = await createArrayBuffer(getPath('IMG_20180725_163423.jpg'))
		var output = await parse(arrayBuffer)
		assert.exists(output, `output is undefined`)
	})

	isBrowser && it(`Browser: Blob`, async () => {
		var blob = await createBlob(getPath('IMG_20180725_163423.jpg'))
		var output = await parse(blob)
		assert.exists(output, `output is undefined`)
	})

	isNode && it(`Node: string file path`, async () => {
		let path = getPath('IMG_20180725_163423.jpg')
		var output = await parse(path)
		assert.exists(output, `output is undefined`)
	})

	isBrowser && it(`Browser: string URL`, async () => {
		let url = getUrl('IMG_20180725_163423.jpg')
		var output = await parse(url)
		assert.exists(output, `output is undefined`)
	})

	isBrowser && it(`Browser: Object URL`, async () => {
		var blob = await createObjectUrl(getPath('IMG_20180725_163423.jpg'))
		var output = await parse(blob)
		assert.exists(output, `output is undefined`)
	})

	it(`Browser & Node: base64 URL`, async () => {
		var blob = await createBase64Url(getPath('IMG_20180725_163423.jpg'))
		var output = await parse(blob)
		assert.exists(output, `output is undefined`)
	})

	isBrowser && it(`Browser: <img> element with normal URL`, async () => {
		var img = createImg(getPath('IMG_20180725_163423.jpg'))
		var output = await parse(img)
		assert.exists(output, `output is undefined`)
	})

	isBrowser && it(`Browser: <img> element with Object URL`, async () => {
		var img = createImg(await createObjectUrl(getPath('IMG_20180725_163423.jpg')))
		var output = await parse(img)
		assert.exists(output, `output is undefined`)
	})

	isBrowser && it(`WebWorker: string URL`, async () => {
		let url = getUrl('IMG_20180725_163423.jpg')
		let output = await createWorker(url)
		assert.isObject(output, `output is undefined`)
	})

	isBrowser && it(`WebWorker: ArrayBuffer`, async () => {
		let arrayBuffer = await createArrayBuffer(getPath('IMG_20180725_163423.jpg'))
		let output = await createWorker(arrayBuffer)
		assert.isObject(output, `output is undefined`)
	})

	//isBrowser && it(`<img> element with base64 URL`, async () => {
	//	var img = createImg(await createBase64Url(getPath('IMG_20180725_163423.jpg')))
	//	await parse(img)
	//})



	// file with short exif where all segments are together at the
	// start of the file, within single chunk

	it(`simple file, read/fetch whole file - should succeed`, async () => {
		let options = {wholeFile: true}
		var output = await parse(getPath('IMG_20180725_163423.jpg'), options)
		assert.equal(output.Make, 'Google')
	})

	it(`simple file, chunked mode, allow additional chunks - should succeed`, async () => {
		let options = {wholeFile: undefined}
		var output = await parse(getPath('IMG_20180725_163423.jpg'), options)
		assert.equal(output.Make, 'Google')
	})

	it(`simple file, chunked mode, no additional chunks - should succeed`, async () => {
		let options = {wholeFile: false}
		var output = await parse(getPath('IMG_20180725_163423.jpg'), options)
		assert.equal(output.Make, 'Google')
	})

	// Exif is scattered throughout the file.
	// Header at the beginning of file, data at the end.
	// tiff offset at 0; ID0 offset at 677442

	it(`scattered file, read/fetch whole file - should succeed`, async () => {
		let options = {wholeFile: true}
		var output = await parse(getPath('001.tif'), options)
		assert.equal(output.Make, 'DJI')
	})

/*
TODO: rewrite chunked reader for 3.0.0
	it(`scattered file, chunked mode, allow additional chunks - should succeed`, async () => {
		let options = {wholeFile: undefined}
		var output = await parse(getPath('001.tif'), options)
		assert.equal(output.Make, 'DJI')
	})

	it(`scattered file, chunked mode, no additional chunks - should fail`, async () => {
		let options = {wholeFile: false}
		var output = await parse(getPath('001.tif'), options)
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

	it(`should return undefined if no exif was found`, async () => {
		var output = await parse(buffers['img_1771_no_exif.jpg'])
		console.log('output', output)
		assert.equal(output, undefined)
	})

	it(`should return undefined if no exif was found (internal .parse() method)`, async () => {
		let intput = buffers['noexif.jpg']
		let parser = new ExifParser()
		await parser.parse(intput)
		let output = await parser.parse()
		assert.isUndefined(output)
	})

	describe('Segments', () => {

		describe('TIFF', () => {

			it(`should contain IFD0 block (as output.image)`, async () => {
				var output = await parse(buffers['IMG_20180725_163423.jpg'], {mergeOutput: false})
				assert.exists(output, `output is undefined`)
				assert.equal(output.image.Make, 'Google')
				assert.equal(output.image.Model, 'Pixel')
			})

			it(`should contain Exif block (as output.exif)`, async () => {
				var output = await parse(buffers['IMG_20180725_163423.jpg'], {mergeOutput: false})
				assert.exists(output, `output is undefined`)
				assert.equal(output.exif.ExposureTime, 0.000376)
			})

			it(`should contain GPS block (as output.gps)`, async () => {
				var output = await parse(buffers['IMG_20180725_163423.jpg'], {mergeOutput: false})
				assert.exists(output, `output is undefined`)
				assert.equal(output.gps.GPSLatitude.length, 3)
				assert.equal(output.gps.GPSLongitude.length, 3)
			})

			it(`should contain interop if requested`, async () => {
				var output = await parse(buffers['IMG_20180725_163423.jpg'], {mergeOutput: false, interop: true})
				assert.exists(output, `output is undefined`)
				assert.equal(output.interop.InteropIndex, 'R98')
			})

			it(`should contain thumbnail (IFD1) if requested`, async () => {
				var output = await parse(buffers['IMG_20180725_163423.jpg'], {mergeOutput: false, thumbnail: true})
				assert.exists(output, `output is undefined`)
				assert.equal(output.thumbnail.ImageHeight, 189)
			})

			it(`should contain GPS block (as output.gps) and processing method`, async () => {
				var output = await parse(buffers['PANO_20180725_162444.jpg'], {mergeOutput: false})
				assert.exists(output, `output is undefined`)
				assert.equal(output.gps.GPSProcessingMethod, 'fused', `output doesn't contain gps`)
			})

			it(`should contain Exif block (as output.exif) if requested`, async () => {
				var output = await parse(buffers['img_1771.jpg'])
				assert.exists(output, `output is undefined`)
				assert.equal(output.ApertureValue, 4.65625)
			})

		})

		describe('XMP', () => {

			it(`is not included by default`, async () => {
				var output = await parse(buffers['cookiezen.jpg'], {mergeOutput: false})
				assert.exists(output, `output is undefined`)
				assert.isUndefined(output.xmp, `xmp shouldnt be included`)
			})

			//it(`XMP - if whole file buffer is provided and options.xmp is enabled`, async () => {
			it(`available as output.xmp if requested with options.xmp`, async () => {
				var output = await parse(buffers['cookiezen.jpg'], {xmp: true, mergeOutput: false})
				assert.exists(output, `output is undefined`)
				assert.typeOf(output.xmp, 'string', `output doesn't contain xmp`)
			})

			it(`should parse XMP even if the file doesn't have TIFF`, async () => {
				var output = await parse(getPath('exifr-issue-4.jpg'), {xmp: true, mergeOutput: false, wholeFile: true})
				assert.isObject(output, `output is undefined`)
				assert.exists(output.xmp, `xmp doesn't exist on exif`)
			})

		})

		it(`IPTC - as output.iptc if requested with options.iptc`, async () => {
			var output = await parse(buffers['Bush-dog.jpg'], {mergeOutput: false, iptc: true, exif: false})
			assert.isObject(output, `output is undefined`)
			assert.isObject(output.iptc, `output does not contain iptc`)
			assert.typeOf(output.iptc.caption, 'string')
			assert.equal(output.iptc.credit, 'AP')
			assert.equal(output.iptc.headline, 'BUSH')
		})

		it(`JFIF`, async () => {
			var output = await parse(getPath('exifr-issue-4.jpg'), {jfif: true, wholeFile: true, mergeOutput: false})
			assert.isObject(output, `output is undefined`)
			assert.isObject(output.jfif, `output does not contain jfif`)
			assert.equal(output.jfif.Ydensity, 96)
			assert.equal(output.jfif.Xthumbnail, 0)
		})

		it(`contains multiple requested segments`, async () => {
			var output = await parse(getPath('exifr-issue-4.jpg'), {xmp: true, jfif: true, wholeFile: true, mergeOutput: false})
			assert.isObject(output, `output is undefined`)
			assert.exists(output.jfif)
			assert.exists(output.xmp)
		})

/*
		// TODO
		it(`should only contain IPTC segment (as output.iptc) if only IPTC is forced`, async () => {
			var output = await parse(buffers['Bush-dog.jpg'], {mergeOutput: false, iptc: true, exif: false}) // TODO: better options to forcce disable everything else
			console.log('output', output)
			assert.equal(output.exif, undefined, `output.exif shouldnt be included`)
			assert.exists(output.iptc, `output.iptc doesn't exist`)
		})
*/
		//it(`should contain ICC segment (as output.icc) if requested`, async () => {
		//	var output = await parse(buffers['Bush-dog.jpg'], {mergeOutput: false, icc: true})
		//	assert.exists(output.icc)
		//})

	})

	describe('output', () => {

		it(`should merge all segments by default`, async () => {
			var output = await parse(buffers['IMG_20180725_163423.jpg'])
			assert.exists(output, `output is undefined`)
			assert.equal(output.Make, 'Google')
			assert.equal(output.ExposureTime, 0.000376)
			assert.equal(output.GPSLongitude.length, 3)
		})

		it(`should translate values to string by default`, async () => {
			var output = await parse(buffers['IMG_20180725_163423.jpg'])
			assert.exists(output, `output is undefined`)
			assert.equal(output.Contrast, 'Normal')
			assert.equal(output.MeteringMode, 'CenterWeightedAverage')
		})

		it(`should not translate values to string if options.postProcess = false`, async () => {
			var output = await parse(buffers['IMG_20180725_163423.jpg'], {postProcess: false})
			assert.exists(output, `output is undefined`)
			assert.equal(output.Contrast, 0)
			assert.equal(output.MeteringMode, 2)
		})

		it(`should revive dates as Date instance by default`, async () => {
			var output = await parse(buffers['IMG_20180725_163423.jpg'])
			assert.exists(output, `output is undefined`)
			assert.instanceOf(output.DateTimeOriginal, Date)
		})

		it(`should not revive dates as Date instance if options.postProcess = false`, async () => {
			var output = await parse(buffers['IMG_20180725_163423.jpg'], {postProcess: false})
			assert.exists(output, `output is undefined`)
			assert.equal(output.DateTimeOriginal, '2018:07:25 16:34:23')
		})

	})

	describe('issues (special cases)', () => {

		it(`#2 - 001.tif starting with 49 49`, async () => {
			var output = await parse(buffers['001.tif'])
			assert.exists(output, `output is undefined`)
			assert.equal(output.Make, 'DJI')
			assert.equal(output.ImageWidth, '640')
			//assert.equal(output.ImageHeight, '512')
			assert.equal(output.latitude, 50.86259891666667)
		})

		it(`#2 - 002.tiff with value type 13 (IFD pointer) instead of 4`, async () => {
			let options = {
				gps: true,
				mergeOutput: false,
			}
			var output = await parse(buffers['002.tiff'], options)
			assert.exists(output.gps)
		})
/*
		// TODO
		it(`#3 - app1 completeness`, async () => {
			let options = {
				tiff: true,
				exif: true,
				xmp: true,
				mergeOutput: false,
			}
			var output = await parse(getPath('exifr-issue-3.jpg'), options)
			console.log(output)
			assert.exists(output.gps)
		})
*/

		it(`#4`, async () => {
			var output = await parse(getPath('exifr-issue-4.jpg'), {xmp: true, wholeFile: true, mergeOutput: false})
			assert.isObject(output, `output is undefined`)
			assert.exists(output.xmp, `xmp doesn't exist on exif`)
			// not sure what to do with this yet
		})

		it(`fast-exif #2 - should not skip exif if 0xFF byte precedes marker`, async () => {
			var output = await parse(buffers['fast-exif-issue-2.jpg'], true)
			assert.exists(output, `output is undefined`)
			assert.equal(output.ApertureValue, 5.655638)
			assert.equal(output.LensModel, '24.0-70.0 mm f/2.8')
		})

		it(`node-exif #58 - should properly detect EXIF`, async () => {
			var output = await parse(buffers['node-exif-issue-58.jpg'], true)
			assert.exists(output, `output is undefined`)
			assert.exists(output.xmp)
		})

		it(`exif-js #124`, async () => {
			var output = await parse(buffers['exif-js-issue-124.tiff'], true)
			assert.exists(output, `output is undefined`)
			assert.equal(output.Make, 'FLIR')
		})

	})

	describe('thumbnail', () => {

		let options = {
			thumbnail: true,
			mergeOutput: false,
		}

		it(`#extractThumbnail() returns Buffer or ArrayBuffer of thumbnail`, async () => {
			let intput = buffers['IMG_20180725_163423.jpg']
			let parser = new ExifParser(options)
			await parser.read(intput)
			var output = await parser.extractThumbnail()
			output = new Uint8Array(output)
			assert.equal(output[0], 0xff)
			assert.equal(output[1], 0xd8)
		})

		it(`#extractThumbnail() returns Buffer or ArrayBuffer of thumbnail (forced after with mergeOutput)`, async () => {
			let intput = buffers['IMG_20180725_163423.jpg']
			let parser = new ExifParser(true)
			await parser.read(intput)
			var output = await parser.extractThumbnail()
			output = new Uint8Array(output)
			assert.equal(output[0], 0xff)
			assert.equal(output[1], 0xd8)
		})

		it(`#extractThumbnail() returns Buffer or ArrayBuffer of thumbnail (default)`, async () => {
			let intput = buffers['IMG_20180725_163423.jpg']
			let parser = new ExifParser()
			await parser.read(intput)
			var output = await parser.extractThumbnail()
			output = new Uint8Array(output)
			assert.equal(output[0], 0xff)
			assert.equal(output[1], 0xd8)
		})

		it(`#extractThumbnail() returns undefined if there's no exif`, async () => {
			let intput = buffers['cookiezen.jpg']
			let parser = new ExifParser()
			await parser.read(intput)
			var output = await parser.extractThumbnail()
			assert.isUndefined(output)
		})

		it(`#extractThumbnail() returns undefined if there's no thumbnail`, async () => {
			let intput = buffers['noexif.jpg']
			let parser = new ExifParser(options)
			await parser.read(intput)
			assert.isUndefined(await parser.extractThumbnail())
		})

		it(`thumbnailBuffer()`, async () => {
			let intput = buffers['IMG_20180725_163423.jpg']
			var output = await thumbnailBuffer(intput, options)
			// Buffer in Node, ArrayBuffer in browser
			output = new Uint8Array(output)
			assert.equal(output[0], 0xff)
			assert.equal(output[1], 0xd8)
		})

		isBrowser && it(`thumbnailUrl()`, async () => {
			let intput = buffers['IMG_20180725_163423.jpg']
			var url = await thumbnailUrl(intput, options)
			assert.typeOf(url, 'string')
		})

	})

})
