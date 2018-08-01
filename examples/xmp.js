var getExif = require('../index.js')
var fs = require('fs').promises

fs.readFile('../test/cookiezen.jpg')
	.then(buffer => getExif(buffer, {xmp: true}))
	.then(console.log)
	.catch(console.error)
