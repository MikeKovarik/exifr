var exifr = require('../index.js')
var fs = require('fs').promises

fs.readFile('../test/fixtures/IMG_20180725_163423.jpg')
	.then(exifr.parse)
	.then(console.log)
	.catch(console.error)

exifr.parse('../test/fixtures/IMG_20180725_163423.jpg')
	.then(console.log)
	.catch(console.error)
