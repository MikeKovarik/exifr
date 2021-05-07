import {FileParserBase, AppSegmentParserBase} from '../parser.mjs'
import {fileParsers, segmentParsers} from '../plugins.mjs'


const JPEG_SOI = 0xffd8

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

function getSegmentType(buffer, offset, length) {
	for (let [type, Parser] of segmentParsers)
		if (Parser.canHandle(buffer, offset, length))
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

	static type = 'jpeg'

	static canHandle(file, firstTwoBytes) {
		return firstTwoBytes === JPEG_SOI
	}

	appSegments = []
	jpegSegments = []
	unknownSegments = []

	async parse() {
		await this.findAppSegments()
		await this.readSegments(this.appSegments)
		this.mergeMultiSegments()
		this.createParsers(this.mergedAppSegments || this.appSegments)
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
		if (!findAll && this.file.chunked) {
			findAll = Array.from(wanted).some(type => {
				let Parser = segmentParsers.get(type)
				let segOpts = this.options[type]
				return Parser.multiSegment && segOpts.multiSegment
			})
			if (findAll) await this.file.readWhole()
		}
		// findAppSegmentsInRange() returns offset where next segment starts. If we didn't store it, next time we continue
		// we might start in middle of data segment and would uselessly read & parse through noise.
		offset = this.findAppSegmentsInRange(offset, file.byteLength)
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
				offset = this.findAppSegmentsInRange(offset, file.byteLength)
				// search for APP segments was cancelled because we reached raw jpeg image data.
				if (offset === undefined) return
			}
		}
	}

	findAppSegmentsInRange(offset, end) {
		// TLDR: Make space for MARKER and LENGTH.
		// Don't read right till end. If the last byte is marker, then length is out of bounds and crashes.
		end -= 2
		let {file, findAll, wanted, remaining, options} = this
		let marker2, length, type, Parser, seg, segOpts
		for (; offset < end; offset++) {
			if (file.getUint8(offset) !== MARKER_1) continue
			// Reading uint8 instead of uint16 to prevent re-reading subsequent bytes.
			marker2 = file.getUint8(offset + 1)
			if (isAppMarker(marker2)) {
				// WE FOUND APP-N SEGMENT
				length = file.getUint16(offset + 2)
				type = getSegmentType(file, offset, length)
				if (type && wanted.has(type)) {
					// known and parseable segment found
					Parser = segmentParsers.get(type)
					seg = Parser.findPosition(file, offset)
					segOpts = options[type]
					seg.type = type
					this.appSegments.push(seg)
					if (!findAll) {
						if (Parser.multiSegment && segOpts.multiSegment) {
							// Found multisegment segment and options allows to process them.
							this.unfinishedMultiSegment = seg.chunkNumber < seg.chunkCount
							// Clear the segment from remaining if we've reached the last multi-segment.
							if (!this.unfinishedMultiSegment) remaining.delete(type)
						} else {
							// Not a multisegment or we're not allowed to process them.
							remaining.delete(type)
						}
						// stop parsing alltogether if we've found all requested segments.
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
				// Compressed data follows after SOS. SOS marker does not have (useful) length bytes.
				// Lot of FF00 follows but those do not have length either. We can stop reading here.
				if (marker2 === MARKER_2_SOS && options.stopAfterSos !== false)
					return undefined
				if (options.recordJpegSegments)
					this.jpegSegments.push({offset, length, marker: marker2})
				offset += length + 1
			}
		}
		return offset
	}

	// Goes through this.appSegments and merge all segments that are split between multiple chunks.
	// The processed array is written to this.mergedAppSegments.
	mergeMultiSegments() {
		let hasMultiSegments = this.appSegments.some(seg => seg.multiSegment)
		if (!hasMultiSegments) return
		let grouped = groupBy(this.appSegments, 'type')
		this.mergedAppSegments = grouped.map(([type, typeSegments]) => {
			let Parser = segmentParsers.get(type, this.options)
			if (Parser.handleMultiSegments) {
				let chunk = Parser.handleMultiSegments(typeSegments)
				return {type, chunk}
			} else {
				return typeSegments[0]
			}
		})
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
	return Array.from(groups)
}

fileParsers.set('jpeg', JpegFileParser)