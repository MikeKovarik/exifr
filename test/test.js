var isBrowser = typeof navigator === 'object'
var isNode = typeof require === 'function' && !isBrowser

if (isBrowser) {
	mocha.setup('bdd')
	setTimeout(() => mocha.run(), 100)
} else {
	var chai = require('chai')
	var path = require('path')
	var fs = require('fs').promises
	var exifr = require('../index.js')
}
var getExif = exifr
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
		var exif = await getExif(buffer)
		assert.exists(exif, `exif doesn't exist`)
	})

	isBrowser && it('ArrayBuffer', async () => {
		var arrayBuffer = await createArrayBuffer(getPath('IMG_20180725_163423.jpg'))
		var exif = await getExif(arrayBuffer)
		assert.exists(exif, `exif doesn't exist`)
	})

	isBrowser && it('Blob', async () => {
		var blob = await createBlob(getPath('IMG_20180725_163423.jpg'))
		var exif = await getExif(blob)
		assert.exists(exif, `exif doesn't exist`)
	})

	isNode && it('string file path', async () => {
		let path = getPath('IMG_20180725_163423.jpg')
		var exif = await getExif(path)
		assert.exists(exif, `exif doesn't exist`)
	})

	isBrowser && it('string URL', async () => {
		let url = getUrl('IMG_20180725_163423.jpg')
		var exif = await getExif(url)
		assert.exists(exif, `exif doesn't exist`)
	})

	isBrowser && it('Object URL', async () => {
		var blob = await createObjectUrl(getPath('IMG_20180725_163423.jpg'))
		var exif = await getExif(blob)
		assert.exists(exif, `exif doesn't exist`)
	})

	it('base64 URL', async () => {
		var blob = await createBase64Url(getPath('IMG_20180725_163423.jpg'))
		var exif = await getExif(blob)
		assert.exists(exif, `exif doesn't exist`)
	})

	isBrowser && it('<img> element with normal URL', async () => {
		var img = createImg(getPath('IMG_20180725_163423.jpg'))
		var exif = await getExif(img)
		assert.exists(exif, `exif doesn't exist`)
	})

	isBrowser && it('<img> element with Object URL', async () => {
		var img = createImg(await createObjectUrl(getPath('IMG_20180725_163423.jpg')))
		var exif = await getExif(img)
		assert.exists(exif, `exif doesn't exist`)
	})

	//isBrowser && it('<img> element with base64 URL', async () => {
	//	var img = createImg(await createBase64Url(getPath('IMG_20180725_163423.jpg')))
	//	await getExif(img)
	//})

/*
TODO: rewrite chunked reader for 3.0.0
	it('chunked mode, allow additional chunks - should not load the whole file', async () => {
		let options = {wholeFile: undefined}
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'), options)
		assert.equal(exif, 'TODO')
	})

	it('chunked mode, no additional chunks - should not load the whole file', async () => {
		let options = {wholeFile: false}
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'), options)
		assert.equal(exif, 'TODO')
	})
*/



	// file with short exif where all segments are together at the
	// start of the file, within single chunk

	it('simple file, read/fetch whole file - should succeed', async () => {
		let options = {wholeFile: true}
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'), options)
		assert.equal(exif.Make, 'Google')
	})

	it('simple file, chunked mode, allow additional chunks - should succeed', async () => {
		let options = {wholeFile: undefined}
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'), options)
		assert.equal(exif.Make, 'Google')
	})

	it('simple file, chunked mode, no additional chunks - should succeed', async () => {
		let options = {wholeFile: false}
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'), options)
		assert.equal(exif.Make, 'Google')
	})

	// Exif is scattered throughout the file.
	// Header at the beginning of file, data at the end.
	// tiff offset at 0; ID0 offset at 677442

	it('scattered file, read/fetch whole file - should succeed', async () => {
		let options = {wholeFile: true}
		var exif = await getExif(getPath('001.tif'), options)
		console.log('exif', exif)
		assert.equal(exif.Make, 'DJI')
	})

	it('scattered file, chunked mode, allow additional chunks - should succeed', async () => {
		let options = {wholeFile: undefined}
		var exif = await getExif(getPath('001.tif'), options)
		console.log('exif', exif)
		assert.equal(exif.Make, 'DJI')
	})

	it('scattered file, chunked mode, no additional chunks - should fail', async () => {
		let options = {wholeFile: false}
		var exif = await getExif(getPath('001.tif'), options)
		assert.equal(exif, undefined)
	})

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
			'exif-js-issue-124.tiff',
		]
		for (let name of images) {
			if (isNode)
				buffers[name] = await fs.readFile(getPath(name))
			else
				buffers[name] = await fetch(getPath(name)).then(res => res.arrayBuffer())
		}
	})

	it('should merge all segments by default', async () => {
		var exif = await getExif(buffers['IMG_20180725_163423.jpg'])
		assert.exists(exif, `exif doesn't exist`)
		assert.equal(exif.Make, 'Google')
		assert.equal(exif.ExposureTime, 0.000376)
		assert.equal(exif.GPSLongitude.length, 3)
	})

	it('should contain IFD0 block (as exif.image)', async () => {
		var exif = await getExif(buffers['IMG_20180725_163423.jpg'], {mergeOutput: false})
		assert.exists(exif, `exif doesn't exist`)
		assert.equal(exif.image.Make, 'Google')
		assert.equal(exif.image.Model, 'Pixel')
	})

	it('should contain Exif block (as exif.exif)', async () => {
		var exif = await getExif(buffers['IMG_20180725_163423.jpg'], {mergeOutput: false})
		assert.exists(exif, `exif doesn't exist`)
		assert.equal(exif.exif.ExposureTime, 0.000376)
	})

	it('should contain GPS block (as exif.gps)', async () => {
		var exif = await getExif(buffers['IMG_20180725_163423.jpg'], {mergeOutput: false})
		assert.exists(exif, `exif doesn't exist`)
		assert.equal(exif.gps.GPSLatitude.length, 3)
		assert.equal(exif.gps.GPSLongitude.length, 3)
	})

	it('should contain interop if requested', async () => {
		var exif = await getExif(buffers['IMG_20180725_163423.jpg'], {mergeOutput: false, interop: true})
		assert.exists(exif, `exif doesn't exist`)
		assert.equal(exif.interop.InteropIndex, 'R98')
	})

	it('should contain thumbnail (IFD1) if requested', async () => {
		var exif = await getExif(buffers['IMG_20180725_163423.jpg'], {mergeOutput: false, thumbnail: true})
		assert.exists(exif, `exif doesn't exist`)
		assert.equal(exif.thumbnail.ImageHeight, 189)
	})

	it('should contain GPS block (as exif.gps) and processing method', async () => {
		var exif = await getExif(buffers['PANO_20180725_162444.jpg'], {mergeOutput: false})
		assert.exists(exif, `exif doesn't exist`)
		assert.equal(exif.gps.GPSProcessingMethod, 'fused', `exif doesn't contain gps`)
	})

	it('should translate values to string by default', async () => {
		var exif = await getExif(buffers['IMG_20180725_163423.jpg'])
		assert.exists(exif, `exif doesn't exist`)
		assert.equal(exif.Contrast, 'Normal')
		assert.equal(exif.MeteringMode, 'CenterWeightedAverage')
	})

	it('should not translate values to string if options.postProcess = false', async () => {
		var exif = await getExif(buffers['IMG_20180725_163423.jpg'], {postProcess: false})
		assert.exists(exif, `exif doesn't exist`)
		assert.equal(exif.Contrast, 0)
		assert.equal(exif.MeteringMode, 2)
	})

	it('should revive dates as Date instance by default', async () => {
		var exif = await getExif(buffers['IMG_20180725_163423.jpg'])
		assert.exists(exif, `exif doesn't exist`)
		assert.instanceOf(exif.DateTimeOriginal, Date)
	})

	it('should not revive dates as Date instance if options.postProcess = false', async () => {
		var exif = await getExif(buffers['IMG_20180725_163423.jpg'], {postProcess: false})
		assert.exists(exif, `exif doesn't exist`)
		assert.equal(exif.DateTimeOriginal, '2018:07:25 16:34:23')
	})

	it('should contain XMP segment (if whole file buffer is provided and options.xmp is enabled)', async () => {
		var exif = await getExif(buffers['cookiezen.jpg'], {mergeOutput: false, xmp: true})
		assert.exists(exif, `exif doesn't exist`)
		assert.typeOf(exif.xmp, 'string', `exif doesn't contain xmp`)
	})

	it('should contain IPTC segment (as exif.iptc) if requested', async () => {
		var exif = await getExif(buffers['Bush-dog.jpg'], {mergeOutput: false, iptc: true})
		assert.exists(exif, `exif doesn't exist`)
		assert.typeOf(exif.iptc.caption, 'string')
		assert.equal(exif.iptc.credit, 'AP')
		assert.equal(exif.iptc.headline, 'BUSH')
	})

	//it('should contain ICC segment (as exif.icc) if requested', async () => {
	//	var exif = await getExif(buffers['Bush-dog.jpg'], {mergeOutput: false, icc: true})
	//	assert.exists(exif.icc)
	//})

	it('should contain Exif block (as exif.exif) if requested', async () => {
		var exif = await getExif(buffers['img_1771.jpg'])
		assert.exists(exif, `exif doesn't exist`)
		assert.equal(exif.ApertureValue, 4.65625)
	})

	it('should return undefined if no exif was found', async () => {
		var exif = await getExif(buffers['img_1771_no_exif.jpg'])
		assert.equal(exif, undefined)
	})

	it('should not skip exif if 0xFF byte precedes marker (fast-exif issue #2)', async () => {
		var exif = await getExif(buffers['fast-exif-issue-2.jpg'], true)
		assert.exists(exif, `exif doesn't exist`)
		assert.equal(exif.ApertureValue, 5.655638)
		assert.equal(exif.LensModel, '24.0-70.0 mm f/2.8')
	})

	it('should properly detect EXIF (node-exif issue #58)', async () => {
		var exif = await getExif(buffers['node-exif-issue-58.jpg'], true)
		assert.exists(exif, `exif doesn't exist`)
		assert.exists(exif.xmp)
	})

	it('.tif file starting with 49 49', async () => {
		var exif = await getExif(buffers['001.tif'])
		assert.exists(exif, `exif doesn't exist`)
		assert.equal(exif.Make, 'DJI')
		assert.equal(exif.ImageWidth, '640')
		//assert.equal(exif.ImageHeight, '512')
		assert.equal(exif.latitude, 50.86259891666667)
	})

	it('exif-js issue #124', async () => {
		var exif = await getExif(buffers['exif-js-issue-124.tiff'], true)
		assert.exists(exif, `exif doesn't exist`)
		assert.equal(exif.Make, 'FLIR')
	})
/*
	// TODO
	it('thumbnail buffer', async () => {
		let options = {
			thumbnail: true,
			mergeOutput: false,
		}
		var exif = await getExif(buffers['IMG_20180725_163423.jpg'], options)
		// EXIF:ThumbnailImage
		let thumbnailBuffer // TODO
		assert.equal(thumbnailBuffer, 'TODO')
	})
*/
})
