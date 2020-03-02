import * as exifr from '../src/bundle-full.js'
import {promises as fs} from 'fs'


(async function() {
	let options = {
		// We don't need TIFF, not thumbnail, so skip this
		tiff: false,
		// Depth map is stred in XMP Extended segment (not the main one).
		xmp: true,
		multiSegment: true,
		mergeOutput: false,
	}
	let output = await exifr.parse('../test/fixtures/xmp depth map.jpg', options)
	if (output && output.GDepth) {
		console.log('File image contains depth map')
		console.log('GDepth.Format', output.GDepth.Format)
		console.log('GDepth.Near', output.GDepth.Near)
		console.log('GDepth.Far', output.GDepth.Far)
		console.log('GDepth.Mime', output.GDepth.Mime)
		// The depth map is stored as base64 string
		let base64 = output.GDepth.Data
		let buffer = Buffer.from(base64, 'base64')
		let ext = output.GDepth.Mime.split('/').pop()
		let fileName = 'depth-map.' + ext
		fs.writeFile(fileName, buffer)
		// besides depth map, there can be original image with no blurring applied.
		if (output && output.GImage) {
			// NOTE: GImage can be also used for "the other eye" in VR photos
			console.log('File image contains unmodified original photo')
			console.log('GImage.Mime', output.GImage.Mime)
			let base64 = output.GImage.Data
			let buffer = Buffer.from(base64, 'base64')
			let ext = output.GImage.Mime.split('/').pop()
			let fileName = 'depth-original.' + ext
			fs.writeFile(fileName, buffer)
		} else {
			console.log(`the file doesn't contain unmodified image`)
		}
	} else {
		console.log('the file has no depth map')
	}
})()