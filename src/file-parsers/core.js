import {segmentParsers} from '../segment-parsers/core.js'


const MAX_APP_SIZE = 65536 // 64kb

export class FileParserBase {

	constructor(options, file, parsers) {
		this.options = options
		this.file = file
		this.parsers = parsers
	}

	createParser(type, chunk) {
		let Parser = segmentParsers[type]
		let parser = new Parser(chunk, this.options, this.file)
		return this.parsers[type] = parser
	}

	ensureSegmentChunk = async seg => {
		//global.recordBenchTime(`exifr.ensureSegmentChunk(${seg.type})`)
		let start = seg.start
		let size = seg.size || MAX_APP_SIZE
		if (this.file.chunked) {
			let available = this.file.isRangeAvailable(start, size)
			if (available) {
				seg.chunk = this.file.subarray(start, size)
			} else {
				try {
					seg.chunk = await this.file.readChunk(start, size)
				} catch (err) {
					throw new Error(`Couldn't read segment: ${JSON.stringify(seg)}. ${err.message}`)
				}
			}
		} else if (this.file.byteLength > start + size) {
			seg.chunk = this.file.subarray(start, size)
		} else if (seg.size === undefined) {
			// we dont know the length of segment and the file is much smaller than the fallback size of 64kbs (MAX_APP_SIZE)
			seg.chunk = this.file.subarray(start)
		} else {
			throw new Error(`Segment unreachable: ` + JSON.stringify(seg))
		}
		return seg.chunk
	}

}
