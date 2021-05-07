import {read} from './reader.mjs'
import {undefinedIfEmpty} from './util/helpers.mjs'
import {Options} from './options.mjs'
import {fileParsers, segmentParsers} from './plugins.mjs'
import {throwError} from './util/helpers.mjs'


export class Exifr {

	parsers = {}
	output = {}
	errors = []
	pushToErrors = err => this.errors.push(err)

	constructor(options) {
		this.options = Options.useCached(options)
	}

	async read(arg) {
		this.file = await read(arg, this.options)
	}

	setup() {
		if (this.fileParser) return
		// JPEG's exif is based on TIFF structure from .tif files.
		// .tif files start with either 49 49 (LE) or 4D 4D (BE) which is also header for the TIFF structure.
		// JPEG starts with with FF D8, followed by APP0 and APP1 section (FF E1 + length + 'Exif\0\0' + data) which contains the TIFF structure (49 49 / 4D 4D + data)
		let {file} = this
		let marker = file.getUint16(0)
		for (let [type, FileParser] of fileParsers) {
			if (FileParser.canHandle(file, marker)) {
				this.fileParser = new FileParser(this.options, this.file, this.parsers)
				return file[type] = true
			}
		}
		// setup is called after read, so we need to close potentially open fs
		if (this.file.close) this.file.close()
		throwError(`Unknown file format`)
	}

	async parse() {
		let {output, errors} = this
		this.setup()
		// We're try catching here and not inside the executeParsers() because we shouldn't parse
		// segments if file parser throws.
		if (this.options.silentErrors) {
			await this.executeParsers().catch(this.pushToErrors)
			errors.push(...this.fileParser.errors)
		} else {
			await this.executeParsers()
		}
		if (this.file.close) this.file.close()
		if (this.options.silentErrors && errors.length > 0) output.errors = errors
		return undefinedIfEmpty(output)
	}

	// TODO: Silent error handling needs major rework in order to enable reading 
	//       at least some segments while others are corrupted.
	//       It'd be nice to move more functionality into segment parsers and hollow out
	//       the file parsers. This way each semgnet would be in own (kinda) thread.
	// EXAMPLE1: All the chunk header calculation happens inside file parser.
	//           If something goes wrong (like bug in IPTC's static canHandle() and headerLength)
	//           it crashes right in fileParser.parse().
	//           tldr: file crashes prematurely on IPTC, no other segments are read.
	// EXAMPLE2: PNG file parser does a lot of parsing inside its .parse()
	//           If it crashed, we'd also prematurely close before extracting any data.
	async executeParsers() {
		let {output} = this
		await this.fileParser.parse()
		let promises = Object.values(this.parsers).map(async parser => {
			let parserOutput = await parser.parse()
			// each parser may want to merge its output into global differently.
			parser.assignToOutput(output, parserOutput)
		})
		if (this.options.silentErrors) {
			promises = promises.map(promise => promise.catch(this.pushToErrors))
		}
		await Promise.all(promises)
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
