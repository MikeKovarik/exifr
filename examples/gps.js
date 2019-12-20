import Exifr from '../src/index-full.js'

Exifr.gps('../test/fixtures/IMG_20180725_163423.jpg')
	.then(console.log)
	.catch(console.error)
