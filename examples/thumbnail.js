var exifr = require('../index.js')
var fs = require('fs').promises

exifr.thumbnailBuffer('../test/fixtures/IMG_20180725_163423.jpg')
	.then(buffer => fs.writeFile('thumb.jpg', buffer))
	.catch(console.error)