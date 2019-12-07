// node --experimental-modules enumerate-segments.js
import {ExifParser} from '../src/index-full.js'
import {promises as fs} from 'fs'
import path from 'path'

(async function() {
	let filePath = path.join('../test/fixtures/001.tif')
	let fileBuffer = await fs.readFile(filePath)
	let exifr = new ExifParser({wholeFile: true, mergeOutput: false})
	await exifr.read(fileBuffer)
	exifr.parse()
})()

function kb(bytes) {
	return Math.round(bytes / 1024) + 'kb'
}

function percentage(offset, length) {
	return Math.round(offset / length * 100)
}