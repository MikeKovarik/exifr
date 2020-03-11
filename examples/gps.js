import * as exifr from '../dist/full.esm.js'

// This is NOT just nice wrapper method that only returns GPS coords.
// exifr.gps uses a lot of performance improvements to only read the GPS as fast as possible.
// This is fact only parses TIFF tag, in which it only reads GPS-IFD Pointer from IFD0 without extracting any other values.
// And in GPS IFD it also only reads as little tags as possible to get the GPS coords.
// TLDR: this is hella fast.
exifr.gps('../test/fixtures/IMG_20180725_163423.jpg')
	.then(console.log)
	.catch(console.error)


// This is how you can do these filters and perf improvements yourself.
diyParseGps()
async function diyParseGps() {
	let options = {
		// setting false on these blocks does not read them at all, except for IFD0 which is necessary
		// because it contains pointer to GPS IFD. Though no tag values are read and once GPS pointer
		// is found the IFD0 search-through ends.
		ifd0: false,
		exif: false,
		// Instead of `true` you can use array of tags to read. All other tags are not read at all.
		// You can use string tag names as well as their numeric code. In this example 0x0004 = GPSLongitude
		gps: ['GPSLatitudeRef', 'GPSLatitude', 0x0003, 0x0004],
		interop: false,
		ifd1: false // thumbnail
	}
	let gps = await exifr.parse('../test/fixtures/IMG_20180725_163423.jpg', options)
	// raw values
	console.log('GPSLatitude', gps.GPSLatitude, gps.GPSLatitudeRef)
	console.log('GPSLongitude', gps.GPSLongitude, gps.GPSLongitudeRef)
	// exifr calculates these into useful coordinates
	console.log(gps.latitude, gps.longitude)
}