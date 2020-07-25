// node --experimental-modules enumerate-segments.js
import * as exifr from '../src/bundles/full.mjs'

//let imagePath = '../test/fixtures/door-knocker.jpg'
let imagePath = '../test/fixtures/empty-imagedesc-in-ifd0.jpg'


// Works
exifr.parse(imagePath)
	.then(output => console.log('----- DEMO 1: OK -----\n', output))
	.catch(err => console.log('----- DEMO 1: FAILED -----\n', err))

// Fails
exifr.parse(imagePath, { xmp: true })
	.then(output => console.log('----- DEMO 2: OK -----\n', output))
	.catch(err => console.log('----- DEMO 2: FAILED -----\n', err))