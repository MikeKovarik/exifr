// this is broken
import {Exifr} from '../src/index-full.js'
import {promises as fs} from 'fs'

class Flir extends Tiff {
	static canHandle(buffer, offset) {
		return buffer.getUint8(offset + 1) === 0xE1
			&& buffer.getUint32(offset + 4) === 0x464c4952 // 'FLIR'
			&& buffer.getUint8(offset + 8) === 0x00       // followed by '\0'
	}
}
Flir.headerLength = 4 // todo: fix this when rollup support class properties

;(async function() {
	let filePath = '../test/fixtures/issue-exifr-3.jpg'
	let fileBuffer = await fs.readFile(filePath)
	let options = {chunked: false, mergeOutput: false, jfif: false, xmp: false, exif: false}
	let exr = new Exifr(options)
	await exr.read(fileBuffer)
	exr.parse()
	let segments = [...exr.appSegments, ...exr.unknownSegments]
	for (let segment of segments) {
		console.log('-----------------')
		console.log(segment.offset, segment.end)
		console.log(segment.type || fileBuffer.slice(segment.offset, segment.offset + 20).toString())
		if (segment.type === undefined) {
			let isFlir = Flir.canHandle(fileBuffer, segment.offset)
			console.log('isFlir', isFlir)
			let parser = new Flir(fileBuffer, segment, options)
			//exr.parseHeader()
			//console.log(parser)
		}
		console.log(fileBuffer.slice(segment.offset, segment.offset + 10).toString().indexOf('FLIR'))
		console.log(fileBuffer.slice(segment.offset, segment.offset + 20))
	}
})()