var ExifParser = require('../index.js')
var fs = require('fs').promises

fs.readFile('../test/IMG_20180725_163423.jpg')
	.then(ExifParser.parse)
	.then(console.log)
	.catch(console.error)

ExifParser.parse('../test/IMG_20180725_163423.jpg')
	.then(console.log)
	.catch(console.error)
