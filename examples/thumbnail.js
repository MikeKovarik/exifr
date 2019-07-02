var ExifParser = require('../index.js')
var fs = require('fs').promises

ExifParser.thumbnail('../test/IMG_20180725_163423.jpg')
	.then(console.log)
	.catch(console.error)