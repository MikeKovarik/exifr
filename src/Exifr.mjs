import {read} from './reader.mjs'
import {undefinedIfEmpty} from './util/helpers.mjs'
import {Options} from './options.mjs'
import {fileParsers, segmentParsers} from './plugins.mjs'
import {throwError} from './util/helpers.mjs'


export class Exifr {

	parsers = {}

	constructor(options) {
		this.options = Options.useCached(options)
	}

	setup() {
		if (this.fileParser) return
		// JPEG's exif is based on TIFF structure from .tif files.
		// .tif files start with either 49 49 (LE) or 4D 4D (BE) which is also header for the TIFF structure.
		// JPEG starts with with FF D8, followed by APP0 and APP1 section (FF E1 + length + 'Exif\0\0' + data) which contains the TIFF structure (49 49 / 4D 4D + data)
		let {file} = this
		let marker = file.getUint16(0)
		for (let [type, FileParser] of fileParsers) {
			//file.tiff = true
			if (FileParser.canHandle(file, marker)) {
				this.fileParser = new FileParser(this.options, this.file, this.parsers)
				return file[type] = true
			}
		}
		throwError(`Unknown file format`)
	}

	async read(arg) {
		this.file = await read(arg, this.options)
	}

	async parse() {
		this.setup()
		await this.fileParser.parse()
		let output = {}
		let errors = []
		let promises = Object.values(this.parsers).map(async parser => {
			let parserOutput
			if (this.options.silentErrors) {
				try {
					parserOutput = await parser.parse()
				} catch(err) {
					errors.push(err)
				}
				// TIFF has many blocks and usually just one fails while the other contain valid data.
				// We want to get as much data as possible.
				errors.push(...parser.errors)
			} else {
				parserOutput = await parser.parse()
			}
			parser.assignToOutput(output, parserOutput)
		})
		await Promise.all(promises)
		if (this.options.silentErrors && errors.length > 0) output.errors = errors
		if (this.file.close) this.file.close()
		return undefinedIfEmpty(output)
	}

	async extractThumbnail() {
		this.setup()
		let {options, file} = this
		let TiffParser = segmentParsers.get('tiff', options)
		var seg
		if (file.tiff)
			seg = {start: 0, type: 'tiff'}
		else if (file.jpeg)
			seg = await this.fileParser.getOrFindSegment('tiff')
		if (seg === undefined) return
		let chunk = await this.fileParser.ensureSegmentChunk(seg)
		let parser = this.parsers.tiff = new TiffParser(chunk, options, file)
		let thumb = await parser.extractThumbnail()
		if (file.close) file.close()
		return thumb
	}

}
