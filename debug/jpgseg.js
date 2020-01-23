// node --experimental-modules enumerate-segments.js
import {Exifr} from '../src/index-full.js'
import {promises as fs} from 'fs'
import path from 'path'

(async function() {
	let filePath = path.join('../test/fixtures/IMG_20180725_163423.jpg')
	let fileBuffer = await fs.readFile(filePath)
	let exr = new Exifr()
	await exr.read(fileBuffer)
	exr.setup()
	await exr.fileParser.findAppSegments(0, true)
    console.log('----- appSegments -----')
    console.log(exr.fileParser.appSegments)
    console.log('----- jpgSegments -----')
    console.log(exr.fileParser.jpgSegments)
    console.log('----- unknownSegments -----')
    console.log(exr.fileParser.unknownSegments)
	//exr.parse()
})()

function kb(bytes) {
	return Math.round(bytes / 1024) + 'kb'
}

function percentage(offset, length) {
	return Math.round(offset / length * 100)
}