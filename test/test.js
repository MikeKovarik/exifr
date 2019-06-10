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


describe('input formats', () => {

	isNode && it('string file path', async () => {
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'))
	})

	isNode && it('Buffer', async () => {
		var buffer = await fs.readFile(getPath('IMG_20180725_163423.jpg'))
		await getExif(buffer)
	})

	isBrowser && it('ArrayBuffer', async () => {
		var arrayBuffer = await createArrayBuffer(getPath('IMG_20180725_163423.jpg'))
		await getExif(arrayBuffer)
	})

	isBrowser && it('Blob', async () => {
		var blob = await createBlob(getPath('IMG_20180725_163423.jpg'))
		await getExif(blob)
	})

	isBrowser && it('Object URL', async () => {
		var blob = await createObjectUrl(getPath('IMG_20180725_163423.jpg'))
		await getExif(blob)
	})

	it('base64 URL', async () => {
		var blob = await createBase64Url(getPath('IMG_20180725_163423.jpg'))
		await getExif(blob)
	})

	isBrowser && it('<img> element with normal URL', async () => {
		var img = createImg(getPath('IMG_20180725_163423.jpg'))
		await getExif(img)
	})

	isBrowser && it('<img> element with Object URL', async () => {
		var img = createImg(await createObjectUrl(getPath('IMG_20180725_163423.jpg')))
		await getExif(img)
	})

	//isBrowser && it('<img> element with base64 URL', async () => {
	//	var img = createImg(await createBase64Url(getPath('IMG_20180725_163423.jpg')))
	//	await getExif(img)
	//})

})



describe('parsed exif data', () => {

	it('should merge all segments by default', async () => {
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'))
		assert.equal(exif.Make, 'Google')
		assert.equal(exif.ExposureTime, 0.000376)
		assert.equal(exif.GPSLongitude.length, 3)
	})

	it('should contain IFD0 block (as exif.image)', async () => {
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'), {mergeOutput: false})
		assert.equal(exif.image.Make, 'Google')
		assert.equal(exif.image.Model, 'Pixel')
	})

	it('should contain Exif block (as exif.exif)', async () => {
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'), {mergeOutput: false})
		assert.equal(exif.exif.ExposureTime, 0.000376)
	})

	it('should contain GPS block (as exif.gps)', async () => {
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'), {mergeOutput: false})
		assert.equal(exif.gps.GPSLatitude.length, 3)
		assert.equal(exif.gps.GPSLongitude.length, 3)
	})

	it('should contain interop if requested', async () => {
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'), {mergeOutput: false, interop: true})
		assert.equal(exif.interop.InteropIndex, 'R98')
	})

	it('should contain thumbnail (IFD1) if requested', async () => {
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'), {mergeOutput: false, thumbnail: true})
		assert.equal(exif.thumbnail.ImageHeight, 189)
	})

	it('should contain GPS block (as exif.gps) and processing method', async () => {
		var exif = await getExif(getPath('PANO_20180725_162444.jpg'), {mergeOutput: false})
		assert.equal(exif.gps.GPSProcessingMethod, 'fused')
	})

	it('should translate values to string by default', async () => {
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'))
		assert.equal(exif.Contrast, 'Normal')
		assert.equal(exif.MeteringMode, 'CenterWeightedAverage')
	})

	it('should not translate values to string if options.postProcess = false', async () => {
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'), {postProcess: false})
		assert.equal(exif.Contrast, 0)
		assert.equal(exif.MeteringMode, 2)
	})

	it('should revive dates as Date instance by default', async () => {
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'))
		assert.instanceOf(exif.DateTimeOriginal, Date)
	})

	it('should not revive dates as Date instance if options.postProcess = false', async () => {
		var exif = await getExif(getPath('IMG_20180725_163423.jpg'), {postProcess: false})
		assert.equal(exif.DateTimeOriginal, '2018:07:25 16:34:23')
	})

	it('should contain XMP segment (if whole file buffer is provided and options.xmp is enabled)', async () => {
		var exif = await getExif(getPath('cookiezen.jpg'), {mergeOutput: false, xmp: true})
		assert.typeOf(exif.xmp, 'string')
	})

	it('should contain IPTC segment (as exif.iptc) if requested', async () => {
		var exif = await getExif(getPath('Bush-dog.jpg'), {mergeOutput: false, iptc: true})
		assert.typeOf(exif.iptc.caption, 'string')
		assert.equal(exif.iptc.credit, 'AP')
		assert.equal(exif.iptc.headline, 'BUSH')
	})

	//it('should contain ICC segment (as exif.icc) if requested', async () => {
	//	var exif = await getExif(getPath('Bush-dog.jpg'), {mergeOutput: false, icc: true})
	//	assert.exists(exif.icc)
	//})

	it('should contain Exif block (as exif.exif) if requested', async () => {
		var exif = await getExif(getPath('img_1771.jpg'))
		assert.equal(exif.ApertureValue, 4.65625)
	})

	it('should return undefined if no exif was found', async () => {
		var exif = await getExif(getPath('img_1771_no_exif.jpg'))
		assert.equal(exif, undefined)
	})

	it('should not skip exif if 0xFF byte precedes marker (fast-exif issue #2)', async () => {
		var exif = await getExif(getPath('fast-exif-issue-2.jpg'), true)
		assert.equal(exif.ApertureValue, 5.655638)
		assert.equal(exif.LensModel, '24.0-70.0 mm f/2.8')
	})

	it('should properly detect EXIF (node-exif issue #58)', async () => {
		var exif = await getExif(getPath('node-exif-issue-58.jpg'), true)
		assert.exists(exif.xmp)
	})

	it('.tif file starting with 49 49', async () => {
		var exif = await getExif(getPath('001.tif'), true)
		assert.exists(exif)
		assert.equal(exif.Make, 'DJI')
		assert.equal(exif.ImageWidth, '640')
		//assert.equal(exif.ImageHeight, '512')
		assert.equal(exif.latitude, 50.86259891666667)
	})

	//it('exif-js issue #124', async () => {
	//	var exif = await getExif(getPath('exif-js-issue-124.tiff'), true)
	//	assert.equal(exif.Make, 'FLIR')
	//})

})
