import {FileParserBase} from '../parser.js'
//import {BufferView} from '../util/BufferView.js'



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

	parseBoxHead(offset) {
		let length     = this.file.getUint32(offset)
		let kind       = this.file.getString(offset + 4, 4)
		let start = offset + 8 // 4+4 bytes
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
		let vflags = this.file.getUint32(box.start)
		box.version = vflags >> 24
		box.start += 4
	}

}

export class HeicFileParser extends IsoBmffParser {

	async parse() {
		var metaBoxOffset = this.file.getUint32(0)
		let meta = this.parseBoxHead(metaBoxOffset)
		await this.file.ensureRange(meta.offset, meta.length)
		this.parseBoxFullHead(meta)
		meta.boxes = this.parseBoxes(meta.start)
		if (this.options.icc.enabled)
			await this.registerSegment('icc',  ...this.findIcc(meta))
		if (this.options.tiff.enabled)
			await this.registerSegment('tiff', ...this.findExif(meta))
	}

	async registerSegment(key, offset, length) {
		await this.file.ensureRange(offset, length)
		let chunk = this.file.subarray(offset, length)
		this.createParser(key, chunk)
	}

	findIcc(meta) {
		let iprp = meta.boxes.find(box => box.kind === 'iprp')
		if (iprp === undefined) return
		let ipco = this.parseBoxes(iprp.start).find(box => box.kind === 'ipco')
		if (ipco === undefined) return
		let colr = this.parseBoxes(ipco.start).find(box => box.kind === 'colr')
		if (colr === undefined) return
		return [colr.offset + 12, colr.length]
	}

	findExif(meta) {
		let iinf = meta.boxes.find(box => box.kind === 'iinf')
		if (iinf === undefined) return
		let iloc = meta.boxes.find(box => box.kind === 'iloc')
		if (iloc === undefined) return
		let exifLocId = this.findExifLocIdInIinf(iinf)
		let [exifOffset, exifLength] = this.findExtentInIloc(iloc, exifLocId)
		let nameSize = this.file.getUint32(exifOffset)
		//let name = this.file.getString(exifOffset + 4, nameSize)
		let extentContentShift = 4 + nameSize
		exifOffset += extentContentShift
		exifLength -= extentContentShift
		return [exifOffset, exifLength]
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
