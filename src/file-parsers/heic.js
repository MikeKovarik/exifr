import {FileParserBase} from '../parser.js'
//import {BufferView} from '../util/BufferView.js'



export class IsoBmffParser extends FileParserBase {
}

export class HeicFileParser extends IsoBmffParser {

	async parse() {
		var metaBoxOffset = this.file.getUint32(0)
		let meta = this.parseBoxHead(metaBoxOffset)
		this.parseMeta(meta)
		this.findIcc(meta)
		this.findExif(meta)
	}

	findIcc(meta) {
		let iprp = meta.boxes.find(box => box.kind === 'iprp')
		if (iprp === undefined) return
		this.parseIprp(iprp)
		let ipco = iprp.boxes.find(box => box.kind === 'ipco')
		if (ipco === undefined) return
		this.parseIpco(ipco)
		let colr = ipco.boxes.find(box => box.kind === 'colr')
		if (colr === undefined) return
		console.log('--------------------- ICC -------------------------')
		console.log(this.file.getString(colr.offset, colr.length))
		console.log('----------------------------------------------------')
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
		console.log('--------------------- EXIF -------------------------')
		console.log(this.file.getString(exifOffset, exifLength))
		console.log('----------------------------------------------------')
	}

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
		let box = {offset, length, kind, start}
		return box
	}

	parseBoxFullHead(box) {
		// ISO boxes come in 'old' and 'full' variants.
		// The 'full' variant also contains version and flags information.
		let vflags = this.file.getUint32(box.start)
		box.version = vflags >> 24
		box.start += 4
	}

	// meta is new box with full head
	parseMeta(box) {
		this.parseBoxFullHead(box)
		box.boxes = this.parseBoxes(box.start)
	}

	// iprp is old box with lite head
	parseIprp(box) {
		box.boxes = this.parseBoxes(box.start)
		// meta -> iprp -> ipco -> colr
	}

	parseIpco(box) {
		box.boxes = this.parseBoxes(box.start)
	}

	parseInfe(box) {
		this.parseBoxFullHead(box)
		box.boxes = this.parseBoxes(box.start)
	}

	findExifLocIdInIinf(box) {
		this.parseBoxFullHead(box)
		let offset = box.start
		let count = this.file.getUint16(offset)
		let infeBox, infeOffset, idSize, name
		offset += 2
		while (count--) {
			infeBox = this.parseBoxHead(offset)
			this.parseInfe(infeBox)
			infeOffset = infeBox.start
			if (infeBox.version >= 2) {
				idSize = infeBox.version === 3 ? 4 : 2
				name = this.file.getString(infeOffset + idSize + 2, 4)
				if (name === 'Exif')
					return this.file.getUintBytes(infeOffset, idSize)
			}
			offset += infeBox.length
		}
	}

    getString(offset) {
        let chars = []
        let char
        while (true) {
            char = this.file.getUint8(offset++)
            if (char === 0) break
            chars.push(char)
		}
        return String.fromCharCode(...chars)
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
