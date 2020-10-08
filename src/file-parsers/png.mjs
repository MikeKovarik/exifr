import {FileParserBase} from '../parser.mjs'
import {fileParsers, segmentParsers} from '../plugins.mjs'
import * as platform from '../util/platform.mjs'
import {BufferView} from '../util/BufferView.mjs'

// https://dev.exiv2.org/projects/exiv2/wiki/The_Metadata_in_PNG_files
// http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html

const PNG_MAGIC_BYTES = '\x89\x50\x4e\x47\x0d\x0a\x1a\x0a'

const PNG_XMP_PREFIX = 'XML:com.adobe.xmp'

const LENGTH_SIZE = 4
const TYPE_SIZE = 4
const CRC_SIZE = 4

const IHDR = 'ihdr'
const ICCP = 'iccp'
const TEXT = 'text'
const ITXT = 'itxt'
const ZTXT = 'ztxt'
const pngMetaChunks = [IHDR, ICCP, TEXT, ITXT, ZTXT]

export class PngFileParser extends FileParserBase {

	static type = 'png'

	static canHandle(file, marker) {
		return marker === 0x8950
			&& file.getUint32(0) === 0x89504e47
			&& file.getUint32(4) === 0x0d0a1a0a
	}

	async parse() {
		let {file} = this
		await this.findPngChunksInRange(PNG_MAGIC_BYTES.length, file.byteLength)
		await this.readSegments(this.metaChunks)
		await this.createParsers(this.metaChunks)
		this.parseTextChunks()
		this.itxtChunks = this.metaChunks.filter(info => info.type === ITXT)
		await this.findExif()
		await this.findXmp()
		await this.findIcc()
	}

	metaChunks = []
	unknownChunks = []

	async findPngChunksInRange(offset, end) {
		let {file} = this
		while (offset < end) {
			let size = file.getUint32(offset) // size without crc
			let marker = file.getUint32(offset + LENGTH_SIZE)
			let name = file.getString(offset + LENGTH_SIZE, 4)
			let type = name.toLowerCase()
			let start = offset + LENGTH_SIZE + TYPE_SIZE
			let length = size + LENGTH_SIZE + TYPE_SIZE + CRC_SIZE
			let seg = {type, offset, length, start, size, marker}
			if (pngMetaChunks.includes(type))
				this.metaChunks.push(seg)
			else
				this.unknownChunks.push(seg)
			offset += length
		}
	}

	// PNG additionally stores simple string key:value pairs each in separate tEXt chunks.
	// There can be many of them, the format is simple enough to not mandate custom segment-parser class.
	// For simplicity's and performance's sake. And these chunks do not specifically belong (like for example into iptc, exif, etc...)
	// So we're just parse it all here and merge the output into ihdr (rest of PNG header data).
	parseTextChunks() {
		let textChunks = this.metaChunks.filter(info => info.type === TEXT)
		for (let seg of textChunks) {
			let [key, val] = this.file.getString(seg.start, seg.size).split('\0')
			this.injectKeyValToIhdr(key, val)
		}
	}

	injectKeyValToIhdr(key, val) {
		let parser = this.parsers.ihdr
		if (parser) parser.raw.set(key, val)
	}

	async findIcc() {
		let seg = this.metaChunks.find(info => info.type === ICCP)
		if (!seg) return
		let {chunk} = seg
		let chunkHead = chunk.getUint8Array(0, 81)
		// icc profile has variable length (up to 80B) followed by null terminator.
		let nameLength = 0
		// Get length of the profile name by looking for the null terminator.
		while (nameLength < 80 && chunkHead[nameLength] !== 0) nameLength++
		// Recalculate actual ICC data position.
		let iccpHeaderLength = nameLength + 2 // 1 byte null terminator, + 1 byte compression
		let actualDataOffset = seg.start + iccpHeaderLength
		let actualDataLength = seg.size - iccpHeaderLength
		//let profileName = this.file.getString(seg.start, nameLength)
		let profileName = chunk.getString(0, nameLength)
		this.injectKeyValToIhdr('ProfileName', profileName)
		// ICC data is zlib compressed by default. Spec doesn't even allow raw data.
		let inflate = await this.getZlibInflate()
		if (inflate) {
			//let dataChunk = this.file.getUint8Array(actualDataOffset, actualDataLength)
			let dataChunk = chunk.getUint8Array(iccpHeaderLength)
			dataChunk = inflate(dataChunk)
			this.injectSegment('icc', dataChunk)
		}
	}

	async findExif() {
		// TODO
		this.ztxtChunks = this.metaChunks.filter(info => info.type === ZTXT)
		for (let seg of this.ztxtChunks) {
			console.log('seg', seg)
			console.log('seg.length', seg.length)
			let {chunk} = seg
			console.log(seg.chunk.getUint8Array(0, 100))
			console.log(seg.chunk.getString())
			let inflate = await this.getZlibInflate()
			if (inflate) {
				let start = 23
				let size = seg.length - start
				let dataChunk = chunk.getUint8Array(start, size)
                console.log('dataChunk', dataChunk)
				dataChunk = inflate(dataChunk)
                console.log('dataChunk', dataChunk)
				let str = dataChunk.toString()
				let arr = hexStringToByte(str)
                console.log(str)
                console.log(arr)
			}
			/*
			let prefix = seg.chunk.getString(0, PNG_XMP_PREFIX.length)
			if (prefix === PNG_XMP_PREFIX)
				this.injectSegment('xmp', seg.chunk)
			*/
		}
	}

	// http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html#C.iTXt
	// iTXt chunk header is slightly complicated. It contains multiple null-terminator-separated info.
	// The XMP data is present after third null-terminator.
	async findXmp() {
		for (let seg of this.itxtChunks) {
			let prefix = seg.chunk.getString(0, PNG_XMP_PREFIX.length)
			if (prefix === PNG_XMP_PREFIX)
				this.injectSegment('xmp', seg.chunk)
		}
	}

	async getZlibInflate() {
		if (platform.node) {
			if (!this.nodeZlib)
				this.nodeZlib = await import('zlib')
			return this.nodeZlib.inflateSync
		} else {
			console.warn(`ICC Profiles in PNG files are zlib compressed.`)
		}
	}

}

function hexStringToByte(hexString) {
	if (!hexString) {
		return new Uint8Array()
	}
	var a = []
	for (var i = 0; i < hexString.length; i+=2) {
		a.push(parseInt(hexString.substr(i, 2), 16))
	}
	return new Uint8Array(a)
}

fileParsers.set('png', PngFileParser)