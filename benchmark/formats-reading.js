var isNode = typeof require === 'function'
var isBrowser = typeof navigator === 'object'

if (isBrowser) {
	var {parse} = window['exifr']
} else if (isNode) {
	var {parse} = require('../dist/full.umd.js')
	var fs = require('fs').promises
}


var imageUrl = '../test/fixtures/IMG_20180725_163423.jpg'

var options = {
	ifd1: false, // thumbnail
	exif: false,
	interop: false,
	gps: true,
}

// Helper functions

async function runExperiment(arg, description) {
	console.time(description)
	var exif = await parse(arg, options)
	console.timeEnd(description)
	//console.log('lat lon', exif.latitude, exif.longitude)
}


// Content creation helper functions

function createImg(src) {
	var img = document.createElement('img')
	img.src = src
	return img
}

function createArrayBuffer() {
	return fetch(imageUrl).then(res => res.arrayBuffer())
}

function createBlob() {
	return fetch(imageUrl).then(res => res.blob())
}

async function createObjectUrl() {
	return URL.createObjectURL(await createBlob())
}

function createBase64Url() {
	return new Promise(async (resolve, reject) => {
		var blob = await createBlob()
		var reader = new FileReader()
		reader.onloadend = () => resolve(reader.result)
		reader.onerror = reject
		reader.readAsDataURL(blob) 
	})
}




// Showtime baby!

// Node-only code
if (isNode) runNodeCode().catch(console.error)
// Browser-only code
if (isBrowser) runBrowserCode().catch(console.error)




async function runNodeCode() {

	var buffer = await fs.readFile(imageUrl)
	await runExperiment(buffer, 'buffer')

	await runExperiment(imageUrl, 'filepath')

}

async function runBrowserCode() {

	var arrayBuffer = await createArrayBuffer()
	await runExperiment(arrayBuffer, `ArrayBuffer`)

	var blob = await createBlob()
	await runExperiment(blob, `Blob`)

	var simpleUrl = imageUrl
	await runExperiment(simpleUrl, `URL`)

	var objectUrl = await createObjectUrl()
	await runExperiment(objectUrl, `Object URL`)

	var base64Url = await createBase64Url()
	await runExperiment(base64Url, `Base64 URL`)

	var imgUrl = createImg(imageUrl)
	await runExperiment(imgUrl, `<img> with simple URL`)

	var imgObjectUrl = createImg(await createObjectUrl())
	await runExperiment(imgObjectUrl, `<img> with Object URL`)

	var imgBase64Url = createImg(await createBase64Url())
	await runExperiment(imgBase64Url, `<img> with Base64 URL`)

}
