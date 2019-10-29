// node --experimental-modules enumerate-segments.mjs
import {ExifParser, Tiff} from '../index.mjs'
import {getUint8, getUint32} from '../src/buff-util.mjs'
import {promises as fs} from 'fs'

class Flir extends Tiff {
	static canHandle(buffer, offset) {
		return getUint8(buffer, offset + 1) === 0xE1
			&& getUint32(buffer, offset + 4) === 0x464c4952 // 'FLIR'
			&& getUint8(buffer, offset + 8) === 0x00       // followed by '\0'
	}
}
Flir.headerLength = 4 // todo: fix this when rollup support class properties

;(async function() {
	let filePath = '../test/fixtures/exifr-issue-3.jpg'
	let fileBuffer = await fs.readFile(filePath)
	let options = {wholeFile: true, mergeOutput: false, jfif: false, xmp: false, exif: false}
	let parser = new ExifParser(options)
	await parser.read(fileBuffer)
	parser.parse()
	let segments = [...parser.segments, ...parser.unknownSegments]
	for (let segment of segments) {
		console.log('-----------------')
		console.log(segment.offset, segment.end)
		console.log(segment.type || fileBuffer.slice(segment.offset, segment.offset + 20).toString())
		if (segment.type === undefined) {
			let isFlir = Flir.canHandle(fileBuffer, segment.offset)
			console.log('isFlir', isFlir)
			let parser = new Flir(fileBuffer, segment, options)
			//parser.parseHeader()
			//console.log(parser)
		}
		console.log(fileBuffer.slice(segment.offset, segment.offset + 10).toString().indexOf('FLIR'))
		console.log(fileBuffer.slice(segment.offset, segment.offset + 20))
	}
})()