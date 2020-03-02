import {FileParserBase, AppSegmentParserBase} from '../parser.js'
import {fileParsers, segmentParsers} from '../plugins.js'
import {BufferView} from '../util/BufferView.js'


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
	jpegSegments = []
	unknownSegments = []

	async parse() {
		await this.findAppSegments()
		await this.readSegments()
		this.createParsers()
	}

	async readSegments() {
		//let ranges = new Ranges(this.appSegments)
		//await Promise.all(ranges.list.map(range => this.file.ensureChunk(range.offset, range.length)))
		let promises = this.appSegments.map(this.ensureSegmentChunk)
		await Promise.all(promises)
	}

	setupSegmentFinderArgs(wanted) {
		if (wanted === true) {
			this.findAll = true
			this.wanted = new Set(segmentParsers.keyList())
		} else {
			if (wanted === undefined)
				wanted = segmentParsers.keyList().filter(key => this.options[key].enabled)
			else
				wanted = wanted.filter(key => this.options[key].enabled && segmentParsers.has(key))
			this.findAll = false
			this.remaining = new Set(wanted)
			this.wanted    = new Set(wanted)
		}
		this.unfinishedMultiSegment = false
	}

	async findAppSegments(offset = 0, wantedArray) {
		this.setupSegmentFinderArgs(wantedArray)
		let {file, findAll, wanted, remaining} = this
		if (!findAll) {
			for (let type of wanted) {
				let Parser = segmentParsers.get(type)
				let parserOptions = this.options[type]
				if (Parser.multiSegment && parserOptions.multiSegment) {
					findAll = true
					if (this.file.chunked) await this.file.readWhole()
					break
				}
			}
		}
		// _findAppSegments() returns offset where next segment starts. If we didn't store it, next time we continue
		// we might start in middle of data segment and would uselessly read & parse through noise.
		offset = this._findAppSegments(offset, file.byteLength, findAll, wanted, remaining)
		// If user only requests TIFF it's not necessary to read any more chunks. Because EXIF in jpg is always near the start of the file.
		if (this.options.onlyTiff) return
		if (file.chunked) {
			// We're in chunked mode and couldn't find all wanted segments.
			// We'll read couple more chunks and parse them until we've found everything or hit chunk limit.
			// EOF = End Of File
			let eof = false
			while (remaining.size > 0 && !eof && (file.canReadNextChunk || this.unfinishedMultiSegment)) {
				let {nextChunkOffset} = file
				// We might have previously found beginning of segment, but only fitst half of it be read in memory.
				let hasIncompleteSegments = this.appSegments.some(seg => !this.file.available(seg.offset || seg.start, seg.length || seg.size))
				// Start reading where we the next block begins. That way we avoid reading part of file where some jpeg image data may be.
				// Unless there's an incomplete segment. In this case start reading right where the last chunk ends to get the whole segment.
				if (offset > nextChunkOffset && !hasIncompleteSegments)
					eof = !await file.readNextChunk(offset)
				else
					eof = !await file.readNextChunk(nextChunkOffset)
				offset = this._findAppSegments(offset, file.byteLength)
				if (offset === undefined) {
					// search for APP segments was cancelled because we reach raw jpeg image data.
					return
				}
			}
		}
	}

	_findAppSegments(offset, end) {
		let {file, findAll, wanted, remaining, options} = this
		let marker2, length, type, Parser, seg, segOpts
		for (; offset < end; offset++) {
			if (file.getUint8(offset) !== MARKER_1) continue
			// Reading uint8 instead of uint16 to prevent re-reading subsequent bytes.
			marker2 = file.getUint8(offset + 1)
			if (isAppMarker(marker2)) {
				// WE FOUND APP-N SEGMENT
				length = file.getUint16(offset + 2)
				type = getSegmentType(file, offset)
				if (type && wanted.has(type)) {
					// known and parseable segment found
					Parser = segmentParsers.get(type)
					seg = Parser.findPosition(file, offset)
					segOpts = options[type]
					seg.type = type
					this.appSegments.push(seg)
					if (!findAll) {
						if (seg.multiSegment && segOpts.multiSegment) {
							// TODO: refactor
							// Countable multisegments
							// Found multisegment segment and options allow to process these.
							if (seg.chunkNumber < seg.chunkCount) {
								// We've not yet reached the last one.
								this.unfinishedMultiSegment = true
							} else {
								// we've reached the last multi-segment.
								this.unfinishedMultiSegment = false
								remaining.delete(type)
							}
						} else if (Parser.multiSegment && segOpts.multiSegment) {
							// TODO: refactor
							// Non-countable multisegments
						} else {
							// TODO: refactor
							// This is not a multisegment seg or we're not allowed to process them.
							remaining.delete(type)
						}
						if (remaining.size === 0) break
					}
				} if (options.recordUnknownSegments) {
					// either unknown/supported appN segment or just a noise.
					seg = AppSegmentParserBase.findPosition(file, offset)
					seg.marker = marker2
					this.unknownSegments.push(seg)
				}
				offset += length + 1
			} else if (isJpgMarker(marker2)) {
				// WE FOUND JPEG FILE STRUCTURE SEGMENT
				length = file.getUint16(offset + 2)
				if (marker2 === MARKER_2_SOS && options.stopAfterSos !== false) {
					// Compressed data follows after SOS. SOS marker does not have length bytes.
					// (it acutally does but its usually 12 - useless). Lot of FF00 markes also
					// follow but those do not have any length either. It's better to stop reading
					// the file here.
					return undefined
				}
				if (options.recordJpegSegments) {
					this.jpegSegments.push({offset, length, marker: marker2})
				}
				offset += length + 1
			}
		}
		return offset
	}

	mergeMultiSegments() {
		let segments
		//handleMultiSegments
		if (this.hasOrderedMultiSegments) {
			// Ordered multisegments
			segments = []
			let multiSegmentTypes = []
			for (let seg of this.appSegments) {
				if (seg.multiSegment) {
					if (multiSegmentTypes.includes(seg.type)) break
					multiSegmentTypes.push(seg.type)
					let ordered = this.appSegments
						.filter(s => s.type === seg.type)
						.sort((a, b) => a.chunkNumber - b.chunkNumber)
					segments.push({
						type: seg.type,
						chunk: concatChunks(ordered)
					})
				} else {
					segments.push(seg)
				}
			}
		} else if (this.hasUnorderedMultiSegments) {
			segments = groupBy(this.appSegments, 'type').map(([type, typeSegments]) => {
				let Parser = segmentParsers.get(type, this.options)
				if (Parser.handleMultiSegments) {
					let chunk = Parser.handleMultiSegments(typeSegments)
					return {type, chunk}
				} else {
					return typeSegments[0]
				}
			})
		} else {
			segments = this.appSegments
		}
		return segments
	}

	// NOTE: This method was created to be reusable and not just one off. Mainly due to parsing ifd0 before thumbnail extraction.
	//       But also because we want to enable advanced users selectively add and execute parser on the fly.
	async createParsers() {
		// IDEA: dynamic loading through import(parser.type) ???
		//       We would need to know the type of segment, but we dont since its implemented in parser itself.
		//       I.E. Unless we first load apropriate parser, the segment is of unknown type.
		let segments = this.mergeMultiSegments()
		for (let segment of segments) {
			let {type, chunk} = segment
			if (!this.options[type].enabled) continue
			let parser = this.parsers[type]
			if (parser && parser.append) {
				// TODO multisegment: to be implemented. or deleted. some types of data may be split into multiple APP segments (FLIR, maybe ICC)
				//parser.append(chunk)
			} else if (!parser) {
				let Parser = segmentParsers.get(type, this.options)
				let parser = new Parser(chunk, this.options, this.file)
				this.parsers[type] = parser
			}
		}
	}

	// TODO: refactor
	get hasOrderedMultiSegments() {
		return this.appSegments.some(seg => seg.multiSegment)
	}

	// TODO: refactor
	get hasUnorderedMultiSegments() {
		let grouped = groupBy(this.appSegments, 'type')
		let groups = Object.values(grouped)
		return groups.some(array => array.length > 1)
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

function groupBy(array, key) {
	let groups = new Map
	let item, groupKey, group
	for (let i = 0; i < array.length; i++) {
		item = array[i]
		groupKey = item[key]
		if (groups.has(groupKey))
			group = groups.get(groupKey)
		else
			groups.set(groupKey, group = [])
		group.push(item)
	}
	return Array.from(groups.entries())
}

// TODO: move to utils
function concatChunks(chunks) {
	let buffers = chunks.map(s => s.chunk.toUint8())
	let combined = concatBuffers(buffers)
    return new BufferView(combined)
}

// TODO: move to utils
function concatBuffers(buffers) {
	let ArrayType = buffers[0].constructor
    let totalLength = 0
    for (let buffer of buffers) totalLength += buffer.length
    let result = new ArrayType(totalLength)
    let offset = 0
    for (let buffer of buffers) {
        result.set(buffer, offset)
        offset += buffer.length
    }
    return result
}

fileParsers.set('jpeg', JpegFileParser)