var isNode = typeof require === 'function'
var isBrowser = typeof navigator === 'object'

if (isBrowser) {
	var ExifParser = window['exifr']
} else if (isNode) {
	var ExifParser = require('../index.js')
	var fs = require('fs').promises
}


var imageUrl = '../test/IMG_20180725_163423.jpg'

var options = {
	thumbnail: false,
	exif: false,
	interop: false,
	gps: true,
}

// Helper functions

async function runExperiment(arg, description) {
	console.log('------------------------------------')
	console.log('Running:', description)
	console.time(description)
	var exif = await ExifParser.parse(arg, options)
	console.log(exif)
	console.log('latitude  ', exif.latitude)
	console.log('longitude', exif.longitude)
	console.timeEnd(description)
}


// Content creation helper functions

function createImg() {
	var img = document.createElement('img')
	document.body.append(img)
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

	var picker = document.querySelector('#fileinput')
	var dropzone = document.querySelector('#dropzone')

	dropzone.addEventListener('dragenter', e => e.preventDefault())
	dropzone.addEventListener('dragover', e => e.preventDefault())
	dropzone.addEventListener('drop', e => {
		e.preventDefault()
		handleFiles(e.dataTransfer.files)
	})
	picker.addEventListener('change', e => handleFiles(picker.files))

	async function handleFiles(files) {
		files = Array.from(files)
		console.time('custom files')
		var now = Date.now()
		var promises = files.map(file => runExperiment(file, `File ${file.name}`))
		await Promise.all(promises)
		console.timeEnd('custom files')
		document.body.after(`${files.length} photos processed in ${Date.now() - now}ms.\n`)
	}

	var arrayBuffer = await createArrayBuffer()
	await runExperiment(arrayBuffer, `arrayBuffer`)

	var blob = await createBlob()
	await runExperiment(blob, `Blob`)

	var simpleUrl = imageUrl
	await runExperiment(simpleUrl, `Url ${simpleUrl}`)

	var objectUrl = await createObjectUrl()
	await runExperiment(objectUrl, `Object Url ${objectUrl}`)

	var base64Url = await createBase64Url()
	await runExperiment(base64Url, `Base64 Url ${base64Url.slice(0, 40)}...`)

	var imgUrl = createImg()
	imgUrl.src = imageUrl
	await runExperiment(imgUrl, `<img> with simple URL: ${imgUrl.src}`)

	var imgObjectUrl = createImg()
	imgObjectUrl.src = await createObjectUrl()
	await runExperiment(imgObjectUrl, `<img> with Object URL: ${imgObjectUrl.src}`)

	var imgBase64Url = createImg()
	imgBase64Url.src = await createBase64Url()
	await runExperiment(imgBase64Url, `<img> with Base64 URL: ${imgBase64Url.src.slice(0, 40)}`)

}
