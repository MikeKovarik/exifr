import {FileParserBase} from '../parser.js'
import {BufferView} from '../util/BufferView.js'
import {TAG_XMP, TAG_IPTC, TAG_ICC} from '../tags.js'


export class TiffFileParser extends FileParserBase {

	extendOptions(options) {
		let {ifd0, xmp, iptc, icc} = options
		if (xmp.enabled === false)  ifd0.skip.add(TAG_XMP)
		else                        ifd0.deps.add(TAG_XMP)
		if (iptc.enabled === false) ifd0.skip.add(TAG_IPTC)
		else                        ifd0.deps.add(TAG_IPTC)
		if (icc.enabled === false)  ifd0.skip.add(TAG_ICC)
		else                        ifd0.deps.add(TAG_ICC)
		ifd0.finalizeFilters()
	}

	async parse() {
		let {tiff, xmp, iptc, icc} = this.options
		if (tiff.enabled || xmp.enabled || iptc.enabled || icc.enabled) {
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
			if (this.options[key].enabled)
				this.createParser(key, chunk)
		}
	}

}
