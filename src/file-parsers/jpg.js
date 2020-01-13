import {FileParserBase, AppSegmentParserBase, segmentParsers} from '../parser.js'


const MARKER_1         = 0xff
const MARKER_2_APP0    = 0xe0 // ff e0
const MARKER_2_APP15   = 0xef // ff ef
const MARKER_2_SOF0    = 0xc0 // ff c0
const MARKER_2_SOF2    = 0xc2 // ff c2
const MARKER_2_DHT     = 0xc4 // ff c4
const MARKER_2_DQT     = 0xdb // ff db
const MARKER_2_DRI     = 0xdd // ff dd
const MARKER_2_SOS     = 0xda // ff da
const MARKER_2_COMMENT = 0xfe // ff fe

function isJpgMarker(marker2) {
	return marker2 === MARKER_2_SOF0
		|| marker2 === MARKER_2_SOF2
		|| marker2 === MARKER_2_DHT
		|| marker2 === MARKER_2_DQT
		|| marker2 === MARKER_2_DRI
		|| marker2 === MARKER_2_SOS
		|| marker2 === MARKER_2_COMMENT
}

function isAppMarker(marker2) {
	return marker2 >= MARKER_2_APP0
		&& marker2 <= MARKER_2_APP15
}

function getSegmentType(buffer, offset) {
	for (let [type, Parser] of segmentParsers)
		if (Parser.canHandle(buffer, offset))
			return type
}


// https://en.wikipedia.org/wiki/JPEG_File_Interchange_Format
// https://sno.phy.queensu.ca/~phil/exiftool/TagNames/JPEG.html
// http://dev.exiv2.org/projects/exiv2/wiki/The_Metadata_in_JPEG_files
// JPG contains SOI, APP1, [APP2, ... APPn], DQT, DHT, and more segments
// APPn contain metadata about the image in various formats. There can be multiple APPn segments,
// even multiple segments of the same type.
// APP1 contains the basic and most important EXIF data.
// APP2 contains ICC
// APP13 contains IPTC
// the main APP1 (the one with EXIF) is often followed by another APP1 with XMP data (in XML format).
// Structure of APPn (APP1, APP2, APP13, etc...):
// - First two bytes are the marker FF En (e.g. FF E1 for APP1)
// - 3rd & 4th bytes are length of the APPn segment
// - Followed by a few bytes of segment itentification - describing what type of content is there.
// Structure of TIFF (APP1-EXIF):
// - FF 01 - marker
// - xx xx - Size
// - 45 78 69 66 00 00 / ASCII string 'Exif\0\0'
// - TIFF HEADER
// - 0th IFD + value
// - 1th IFD + value
// - may contain additional GPS, Interop, SubExif blocks (pointed to from IFD0)
export class JpegFileParser extends FileParserBase {

	appSegments = []
	jpgSegments = []
	unknownSegments = []

	async parse() {
		//global.recordBenchTime(`exifr.parse()`)
		await this.findAppSegments()
		await this.readSegments()
		this.createParsers()
	}

	async readSegments() {
		//global.recordBenchTime(`exifr.readSegments()`)
		//let ranges = new Ranges(this.appSegments)
		//await Promise.all(ranges.list.map(range => this.file.ensureChunk(range.offset, range.length)))
		let promises = this.appSegments.map(this.ensureSegmentChunk)
		await Promise.all(promises)
		/*
		// TODO: implement multi-segment
		let multiSegments = this.appSegments.filter(seg => seg.multiSegment)
		let types = unique(multiSegments.map(seg => seg.type))
		for (let type of types) {
			let segments = multiSegments
				.filter(seg => seg.type === type)
				.sort((a, b) => a.chunkNumber - b.chunkNumber)
            console.log(type, segments)
		}
		*/
	}

	async findAppSegments(offset = 0, wanted) {
		//global.recordBenchTime(`exifr.findAppSegments()`)
		let findAll
		let remaining
		if (wanted === true) {
			findAll = true
			wanted  = new Set(segmentParsers.keys())
		} else {
			if (wanted === undefined)
				wanted = segmentParsers.keys().filter(key => this.options[key].enabled)
			else
				wanted = wanted.filter(key => this.options[key].enabled && segmentParsers.has(key))
			findAll = false
			remaining = new Set(wanted)
			wanted    = new Set(wanted)
		}
		if (!findAll) {
			for (let type of wanted) {
				let Parser = segmentParsers.get(type)
				if (Parser.multiSegment) {
					findAll = true
					await this.file.readWhole()
					break
				}
			}
		}
		let file = this.file
		// _findAppSegments() returns offset where next segment starts. If we didn't store it, next time we continue
		// we might start in middle of data segment and would uselessly read & parse through noise.
		offset = this._findAppSegments(offset, file.byteLength, findAll, wanted, remaining)
		if (file.chunked) {
			// We're in chunked mode and couldn't find all wanted segments.
			// We'll read couple more chunks and parse them until we've found everything or hit chunk limit.
			while (remaining.size > 0 && file.chunksRead < this.options.chunkLimit) {
				let {nextChunkOffset} = file
				// We might have previously found beginning of segment, but only first half might be read in memory.
				let hasIncompleteSegments = this.appSegments.some(seg => seg.start < nextChunkOffset && seg.end >= nextChunkOffset)
				// Start reading where we the next block begins. That way we avoid reading part of file where some jpeg image data may be.
				// Unless there's an incomplete segment. In this case start reading right where the last chunk ends to get the whole segment.
				if (offset > nextChunkOffset && !hasIncompleteSegments)
					await file.readNextChunk(offset)
				else
					await file.readNextChunk(nextChunkOffset)
				offset = this._findAppSegments(offset, file.byteLength, findAll, wanted, remaining)
			}
		}
		//global.recordBenchTime(`segments found`)
	}

	_findAppSegments(offset, end, findAll, wanted, remaining) {
		let file = this.file
		for (; offset < end; offset++) {
			if (file.getUint8(offset) !== MARKER_1) continue
			// Reading uint8 instead of uint16 to prevent re-reading subsequent bytes.
			let marker2 = file.getUint8(offset + 1)
			let isAppSegment = isAppMarker(marker2)
			let isJpgSegment = isJpgMarker(marker2)
			// All JPG 
			if (!isAppSegment && !isJpgSegment) continue
			let length = file.getUint16(offset + 2)
			if (isAppSegment) {
				let type = getSegmentType(file, offset)
				if (type && wanted.has(type)) {
					// known and parseable segment found
					let Parser = segmentParsers.get(type)
					let seg = Parser.findPosition(file, offset)
					seg.type = type
					this.appSegments.push(seg)
					if (!findAll) {
						if (seg.chunkCount === undefined || seg.chunkNumber === seg.chunkCount) {
							// only mark the segment type as done when all of its segments
							// (if it is split into multiple) are found
							remaining.delete(type)
						}
						if (remaining.size === 0) break
					}
				} else {
					// either unknown/supported appN segment or just a noise.
					let seg = AppSegmentParserBase.findPosition(file, offset)
					this.unknownSegments.push(seg)
				}
			} else if (isJpgSegment) {
				this.jpgSegments.push({offset, length})
			}
			offset += length + 1
		}
		return offset
	}

	// NOTE: This method was created to be reusable and not just one off. Mainly due to parsing ifd0 before thumbnail extraction.
	//       But also because we want to enable advanced users selectively add and execute parser on the fly.
	async createParsers() {
		//global.recordBenchTime(`exifr.createParsers()`)
		// IDEA: dynamic loading through import(parser.type) ???
		//       We would need to know the type of segment, but we dont since its implemented in parser itself.
		//       I.E. Unless we first load apropriate parser, the segment is of unknown type.
		for (let segment of this.appSegments) {
			let {type, chunk} = segment
			if (!this.options[type].enabled) continue
			let parser = this.parsers[type]
			if (parser && parser.append) {
				// TODO: to be implemented. or deleted. some types of data may be split into multiple APP segments (FLIR, maybe ICC)
				parser.append(chunk)
			} else if (!parser) {
				let Parser = segmentParsers.getSafe(type, this.options)
				let parser = new Parser(chunk, this.options, this.file)
				this.parsers[type] = parser
			}
		}
	}

	getSegment(type) {
		return this.appSegments.find(seg => seg.type === type)
	}

	async getOrFindSegment(type) {
		let seg = this.getSegment(type)
		if (seg === undefined) {
			await this.findAppSegments(0, [type])
			seg = this.getSegment(type)
		}
		return seg
	}

}

function unique(array) {
	return Array.from(new Set(array))
}