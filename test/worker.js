importScripts('../index.js')

self.onmessage = async e => {
	console.log('worker received task from main', e.data)
	var exif = await exifr.parse(e.data)
	console.log('worker parsed exif', exif)
	postMessage(exif)
}
