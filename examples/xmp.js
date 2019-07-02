var ExifParser = require('../index.js')
var fs = require('fs').promises

fs.readFile('../test/cookiezen.jpg')
	.then(buffer => ExifParser.parse(buffer, {xmp: true}))
	.then(console.log)
	.catch(console.error)
