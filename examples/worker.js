importScripts('../dist/lite.umd.js')

self.onmessage = async e => {
	console.log('worker received task from main')
	var exif = await exifr.parse(e.data)
	console.log('worker parsed exif')
	postMessage(exif)
}
