importScripts('../index.js')
var ExifParser = self.exifr // UMD

self.onmessage = async e => {
	console.log('worker received task from main')
	var exif = await ExifParser.parse(e.data)
	console.log('worker parsed exif')
	postMessage(exif)
}
