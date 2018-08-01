var getExif = require('../index.js')
var fs = require('fs').promises

fs.readFile('../test/IMG_20180725_163423.jpg')
	.then(getExif)
	.then(console.log)
	.catch(console.error)

getExif('../test/IMG_20180725_163423.jpg')
	.then(console.log)
	.catch(console.error)
