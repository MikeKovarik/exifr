import {FileParserBase} from '../parser.js'
import {BufferView} from '../util/BufferView.js'
import {TAG_XMP, TAG_IPTC, TAG_ICC} from '../tags.js'


export class TiffFileParser extends FileParserBase {

	async parse() {
		let options = this.options

		if (options.xmp === false)  options.addSkipTags('ifd0', [TAG_XMP])
		else                        options.addPick('ifd0', [TAG_XMP], false)
		if (options.iptc === false) options.addSkipTags('ifd0', [TAG_IPTC])
		else                        options.addPick('ifd0', [TAG_IPTC], false)
		if (options.icc === false)  options.addSkipTags('ifd0', [TAG_ICC])
		else                        options.addPick('ifd0', [TAG_ICC], false)
/*
		if (options.xmp)  options.addPick('ifd0', [TAG_XMP], false)
		if (options.iptc) options.addPick('ifd0', [TAG_IPTC], false)
		if (options.icc)  options.addPick('ifd0', [TAG_ICC], false)
		//if (options.photoshop) options.addPick('ifd0', [TAG_PHOTOSHOP], false)
*/
		if (options.tiff || options.xmp || options.iptc || options.icc) {
			// The file starts with TIFF structure (instead of JPEGs FF D8)
			// Why XMP?: .tif files store XMP as ApplicationNotes tag in TIFF structure.
			let seg = {start: 0, type: 'tiff'}
			let chunk = await this.ensureSegmentChunk(seg)
			if (chunk === undefined) throw new Error(`Couldn't read chunk`)
			this.createParser('tiff', chunk)
			this.parsers.tiff.parseHeader()
			await this.parsers.tiff.parseIfd0Block()

			this.adaptTiffPropAsSegment('xmp')
			this.adaptTiffPropAsSegment('iptc')
			this.adaptTiffPropAsSegment('icc')
		}
	}

	adaptTiffPropAsSegment(key) {
		if (this.parsers.tiff[key]) {
			let rawData = this.parsers.tiff[key]
			let chunk = BufferView.from(rawData)
			if (this.options[key])
				this.createParser(key, chunk)
			else
				this.createDummyParser(key, chunk.getString())
		}
	}

	createDummyParser = (type, output) => {
		this.parsers[type] = {
			constructor: {type},
			parse: () => output,
		}
	}

}
