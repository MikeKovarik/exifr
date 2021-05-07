import {FileParserBase} from '../parser.mjs'
import {TAG_XMP, TAG_IPTC, TAG_ICC} from '../tags.mjs'
import {fileParsers} from '../plugins.mjs'
import {estimateMetadataSize} from '../util/helpers.mjs'
import {TIFF_LITTLE_ENDIAN, TIFF_BIG_ENDIAN} from '../util/helpers.mjs'


export class TiffFileParser extends FileParserBase {

	static type = 'tiff'

	static canHandle(file, firstTwoBytes) {
		return firstTwoBytes === TIFF_LITTLE_ENDIAN
			|| firstTwoBytes === TIFF_BIG_ENDIAN
	}

	extendOptions(options) {
		// note: skipping is done on global level in Options class
		let {ifd0, xmp, iptc, icc} = options
		if (xmp.enabled)  ifd0.deps.add(TAG_XMP)
		if (iptc.enabled) ifd0.deps.add(TAG_IPTC)
		if (icc.enabled)  ifd0.deps.add(TAG_ICC)
		ifd0.finalizeFilters()
	}

	async parse() {
		let {tiff, xmp, iptc, icc} = this.options
		if (tiff.enabled || xmp.enabled || iptc.enabled || icc.enabled) {
			// TODO: refactor this in the future
			// Tiff files start with TIFF structure (instead of JPEGs FF D8) but offsets can point to any place in the file.
			// even wihin single block. Crude option is to just read as big chunk as possible.
			// TODO: in the future, block reading will be recursive or looped until all pointers are resolved.
			// SIDE NOTE: .tif files stor XMP as ApplicationNotes tag in TIFF structure as well.
			let length = Math.max(estimateMetadataSize(this.options), this.options.chunkSize)
			await this.file.ensureChunk(0, length)
			this.createParser('tiff', this.file)
			this.parsers.tiff.parseHeader()
			await this.parsers.tiff.parseIfd0Block()
			this.adaptTiffPropAsSegment('xmp')
			this.adaptTiffPropAsSegment('iptc')
			this.adaptTiffPropAsSegment('icc')
		}
	}

	adaptTiffPropAsSegment(type) {
		if (this.parsers.tiff[type]) {
			// TIFF stores all other segments as tags in IFD0 object. Get the tag.
			let raw = this.parsers.tiff[type]
			this.injectSegment(type, raw)
		}
	}

}

fileParsers.set('tiff', TiffFileParser)