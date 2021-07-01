// node --experimental-modules enumerate-segments.js
import * as exifr from '../src/bundles/full.mjs'
import {promises as fs} from 'fs'

//fs.readFile('../test/fixtures/issue-fast-exif-2.jpg')
//fs.readFile('../test/fixtures/IMG_20180725_163423.jpg')
//fs.readFile('../test/fixtures/Bush-dog.jpg')
fs.readFile('../test/fixtures/tif-with-iptc-icc-xmp.tif')
	.then(async buffer => {
		const output = await exifr.parse(buffer, {icc: true, mergeOutput: false})
		console.log('output', output.icc)
	})