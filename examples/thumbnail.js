var exifr = require('exifr')
var fs = require('fs').promises

exifr.thumbnail('../test/fixtures/IMG_20180725_163423.jpg')
	.then(buffer => fs.writeFile('thumb.jpg', buffer))
	.catch(console.error)