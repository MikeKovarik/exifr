import {fileParsers} from '../plugins.mjs'
import {FileParserBase} from '../parser.mjs'
// Only HEIC uses BufferView.getUint64
import '../util/BufferView-get64.mjs'
import {BufferView} from '../util/BufferView.mjs'


// 4 length + 4 kind + 8 (not always) for additional 64b length field
const boxHeaderLength = 16

// boxes with full head: meta, iinf, iref

export class IsoBmffParser extends FileParserBase {

	parseBoxes(offset = 0) {
		let boxes = []
		while (offset < this.file.byteLength - 4) {
			let box = this.parseBoxHead(offset)
			boxes.push(box)
			if (box.length === 0) break
			offset += box.length
		}
		return boxes
	}

	parseSubBoxes(box) {
		box.boxes = this.parseBoxes(box.start)
	}

	findBox(box, kind) {
		if (box.boxes === undefined) this.parseSubBoxes(box)
		return box.boxes.find(box => box.kind === kind)
	}

	parseBoxHead(offset) {
		let length = this.file.getUint32(offset)
		let kind   = this.file.getString(offset + 4, 4)
		let start  = offset + 8 // 4+4 bytes
		// length can be larger than 32b number in which case it is the first 64bits after header
		if (length === 1) {
			length = this.file.getUint64(offset + 8)
			start += 8
		}
		return {offset, length, kind, start}
	}

	parseBoxFullHead(box) {
		// ISO boxes come in 'old' and 'full' variants.
		// The 'full' variant also contains version and flags information.
		if (box.version !== undefined) return
		let vflags = this.file.getUint32(box.start)
		box.version = vflags >> 24
		box.start += 4
	}

}

export class HeifFileParser extends IsoBmffParser {

	// NOTE: most parsers check if bytes 4-8 are 'ftyp' and then if 8-12 is one of heic/heix/hevc/hevx/heim/heis/hevm/hevs/mif1/msf1
	//       but bytes 20-24 are actually always 'heic' for all of these formats
	static canHandle(file, firstTwoBytes) {
		// The file starts with 4 byte FTYP number. The value is unlikely more than 30, let alone 2^32 FTYPs.
		// So it's safe to assume that if first two bytes are 0, then this is HEIC.
		if (firstTwoBytes !== 0) return false
		let ftypLength = file.getUint16(2)
		if (ftypLength > 50) return false
		let offset = 16
		let compatibleBrands = []
		while (offset < ftypLength) {
			compatibleBrands.push(file.getString(offset, 4))
			offset += 4
		}
		return compatibleBrands.includes(this.type)
	}

	async parse() {
		let nextBoxOffset = this.file.getUint32(0)
		let meta = this.parseBoxHead(nextBoxOffset)
		while (meta.kind !== 'meta') {
			nextBoxOffset += meta.length
			await this.file.ensureChunk(nextBoxOffset, boxHeaderLength)
			meta = this.parseBoxHead(nextBoxOffset)
		}
		await this.file.ensureChunk(meta.offset, meta.length)
		this.parseBoxFullHead(meta)
		this.parseSubBoxes(meta)
		//await this.findThumb(meta)
		if (this.options.icc.enabled)  await this.findIcc(meta)
		if (this.options.tiff.enabled) await this.findExif(meta)
	}

	async registerSegment(key, offset, length) {
		await this.file.ensureChunk(offset, length)
		let chunk = this.file.subarray(offset, length)
		this.createParser(key, chunk)
	}
/*
	async findThumb(meta) {
		let iref = this.findBox(meta, 'iref')
		if (iref === undefined) return
		this.parseBoxFullHead(iref)
		let thmb = this.findBox(iref, 'thmb')
		if (thmb === undefined) return
		let thumbLocId = this.file.getUint16(thmb.offset + 8)
		let iloc = this.findBox(meta, 'iloc')
		if (iloc === undefined) return
		let extent = this.findExtentInIloc(iloc, thumbLocId)
		if (extent === undefined) return
		let [thumbOffset, thumbLength] = extent
		console.log('thumbOffset', thumbOffset)
		console.log('thumbLength', thumbLength)
		await this.file.ensureChunk(thumbOffset, thumbLength)
		let chunk = this.file.subarray(thumbOffset, thumbLength)
		return chunk.toUint8()
	}
*/
	async findIcc(meta) {
		let iprp = this.findBox(meta, 'iprp')
		if (iprp === undefined) return
		let ipco = this.findBox(iprp, 'ipco')
		if (ipco === undefined) return
		let colr = this.findBox(ipco, 'colr')
		if (colr === undefined) return
		await this.registerSegment('icc', colr.offset + 12, colr.length)
	}

	async findExif(meta) {
		let iinf = this.findBox(meta, 'iinf')
		if (iinf === undefined) return
		let iloc = this.findBox(meta, 'iloc')
		if (iloc === undefined) return
		let exifLocId = this.findExifLocIdInIinf(iinf)
		let extent = this.findExtentInIloc(iloc, exifLocId)
		if (extent === undefined) return
		let [exifOffset, exifLength] = extent
		await this.file.ensureChunk(exifOffset, exifLength)
		let nameSize = this.file.getUint32(exifOffset)
		//let name = this.file.getString(exifOffset + 4, nameSize)
		let extentContentShift = 4 + nameSize
		exifOffset += extentContentShift
		exifLength -= extentContentShift
		await this.registerSegment('tiff', exifOffset, exifLength)
	}

	findExifLocIdInIinf(box) {
		this.parseBoxFullHead(box)
		let offset = box.start
		let count = this.file.getUint16(offset)
		let infe, infeOffset, idSize, name
		offset += 2
		while (count--) {
			infe = this.parseBoxHead(offset)
			this.parseBoxFullHead(infe)
			infeOffset = infe.start
			if (infe.version >= 2) {
				idSize = infe.version === 3 ? 4 : 2
				name = this.file.getString(infeOffset + idSize + 2, 4)
				if (name === 'Exif')
					return this.file.getUintBytes(infeOffset, idSize)
			}
			offset += infe.length
		}
	}

	get8bits(offset) {
		let n = this.file.getUint8(offset)
		let n0 = n >> 4
		let n1 = n & 0xf
		return [n0, n1]
	}

	findExtentInIloc(box, wantedLocId) {
		this.parseBoxFullHead(box)
		let offset = box.start
		let [offsetSize, lengthSize]    = this.get8bits(offset++)
		let [baseOffsetSize, indexSize] = this.get8bits(offset++)
		let itemIdSize = box.version === 2 ? 4 : 2
		let constMethodSize = box.version === 1 || box.version === 2 ? 2 : 0
		let extentSize = indexSize + offsetSize + lengthSize
		let itemCountSize = box.version === 2 ? 4 : 2
		let itemCount = this.file.getUintBytes(offset, itemCountSize)
		offset += itemCountSize
		while (itemCount--) {
			let itemId = this.file.getUintBytes(offset, itemIdSize)
			offset += itemIdSize + constMethodSize + 2 + baseOffsetSize // itemId + construction_method + data_reference_index + base_offset
			let extentCount = this.file.getUint16(offset)
			offset += 2
			if (itemId === wantedLocId) {
				if (extentCount > 1) {
					console.warn(`ILOC box has more than one extent but we're only processing one\nPlease create an issue at https://github.com/MikeKovarik/exifr with this file`)
					// iloc contains items array, each of which contains extents.
					// theres usually only one extent in each item but if there's more
				}
				return [
					// extent offset
					this.file.getUintBytes(offset + indexSize, offsetSize),
					// extent length
					this.file.getUintBytes(offset + indexSize + offsetSize, lengthSize),
				]
			}
			offset += extentCount * extentSize
		}
	}

}

export class HeicFileParser extends HeifFileParser {
	static type = 'heic'
}

export class AvifFileParser extends HeifFileParser {
	static type = 'avif'
}

fileParsers.set('heic', HeicFileParser)
fileParsers.set('avif', AvifFileParser)