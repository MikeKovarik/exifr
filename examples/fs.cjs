// NOTE: run this outside of this library, because we use {"type": "module"} in package.json
// which makes node interpret all *.js files as ES Modules.

var exifr = require('../dist/full.umd.js')
var fs = require('fs').promises

fs.readFile('../test/fixtures/IMG_20180725_163423.jpg')
	.then(exifr.parse)
	.then(console.log)
	.catch(console.error)

exifr.parse('../test/fixtures/IMG_20180725_163423.jpg')
	.then(console.log)
	.catch(console.error)
