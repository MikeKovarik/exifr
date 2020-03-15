let img = document.createElement('img')
img.onload = async e => {
	let [exif, gps, orientation] = await Promise.all([
		exifr.parse(img),
		exifr.gps(img),
		exifr.orientation(img),
	])
	if (window.testResult) window.testResult({exif, gps, orientation})
}
img.src = '../fixtures/IMG_20180725_163423-tiny.jpg'