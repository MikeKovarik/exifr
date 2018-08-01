importScripts('../index.js')
var getExif = self.exifr // UMD

self.onmessage = async e => {
	console.log('worker received task from main')
	var exif = await getExif(e.data)
	console.log('worker parsed exif')
	postMessage(exif)
}
