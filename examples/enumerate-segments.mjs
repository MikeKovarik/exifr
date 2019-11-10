// node --experimental-modules enumerate-segments.js
import {ExifParser} from '../src/index-full.js'
import {promises as fs} from 'fs'
import path from 'path'

(async function() {
	let allFiles = await fs.readdir('../test/fixtures/')
	let imageFiles = allFiles.filter(name => name.endsWith('.jpg') || name.endsWith('.tiff') || name.endsWith('.tif'))
	for (let fileName of imageFiles) {
		let filePath = path.join('../test/fixtures/', fileName)
		let fileBuffer = await fs.readFile(filePath)
		let exifr = new ExifParser({wholeFile: true, mergeOutput: false})
		await exifr.read(fileBuffer)
		exifr.parse()
		console.log('----------------------------------------------------')
		console.log('file name', filePath)
		console.log('file size', fileBuffer.length, kb(fileBuffer.length))
		let segments = [...exifr.appSegments, ...exifr.unknownSegments]
		for (let segment of segments) {
			//console.log(segment)
			console.log(
				'-',
				/*
				segment.offset, segment.end,
				*/
				'|',
				kb(segment.offset), kb(segment.end),
				'|',
				percentage(segment.offset, fileBuffer.length), percentage(segment.end, fileBuffer.length),
				'|',
				segment.type || fileBuffer.slice(segment.offset, segment.offset + 20).toString(),
				fileBuffer.slice(segment.offset, segment.offset + 20)
			)
		}
	}
})()

function kb(bytes) {
	return Math.round(bytes / 1024) + 'kb'
}

function percentage(offset, length) {
	return Math.round(offset / length * 100)
}