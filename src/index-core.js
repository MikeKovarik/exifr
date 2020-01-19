import './util/debug.js' // TODO: DELETEME: TO BE REMOVED BEFORE RELEASING
import {read} from './reader.js'
import {gpsOnlyOptions} from './options.js'
import {TIFF_LITTLE_ENDIAN, TIFF_BIG_ENDIAN} from './util/helpers.js'
import {undefinedIfEmpty} from './util/helpers.js'
// exposed
import {Options} from './options.js'
import {tagKeys, tagValues, tagRevivers} from './tags.js'
import {fileReaders} from './reader.js'
import {fileParsers, segmentParsers} from './parser.js'
import * as platform from './util/platform.js'


const JPEG_SOI = 0xffd8

function isHeic(file) {
	let ftypLength = file.getUint32(0)
	let offset = 16
	let compatibleBrands = []
	while (offset < ftypLength) {
		compatibleBrands.push(file.getString(offset, 4))
		offset += 4
	}
	return compatibleBrands.includes('heic')
}

export default class Exifr {

	// ------------------------- STATIC -------------------------

	static Options = Options
	static fileReaders = fileReaders
	static fileParsers = fileParsers
	static segmentParsers = segmentParsers
	static tagKeys = tagKeys
	static tagValues = tagValues
	static tagRevivers = tagRevivers

	static async parse(input, options) {
		let exifr = new Exifr(options)
		await exifr.read(input)
		return exifr.parse()
	}

	static async thumbnail(input, options = {}) {
		options.thumbnail = true
		options.mergeOutput = true
		let exifr = new Exifr(options)
		await exifr.read(input)
		let uint8array = await exifr.extractThumbnail()
		if (uint8array && platform.hasBuffer)
			return Buffer.from(uint8array)
		else
			return uint8array
	}

	// only available in browser
	static async thumbnailUrl(...args) {
		let uint8array = await this.thumbnail(...args)
		if (uint8array !== undefined) {
			let blob = new Blob([uint8array.buffer])
			return URL.createObjectURL(blob)
		}
	}

	static async gps(input) {
		let exifr = new Exifr(gpsOnlyOptions)
		await exifr.read(input)
		let output = await exifr.parse()
		let {latitude, longitude} = output.gps
		return {latitude, longitude}
	}

	// to be exposed in future versions
	//static async parseAppSegments(input, options) {}

	// ------------------------- INSTANCE -------------------------

	parsers = {}

	constructor(options) {
		this.options = new Options(options)
	}

	setup() {
		//global.recordBenchTime(`exifr.parse()`)
		if (this.fileParser) return
		// JPEG's exif is based on TIFF structure from .tif files.
		// .tif files start with either 49 49 (LE) or 4D 4D (BE) which is also header for the TIFF structure.
		// JPEG starts with with FF D8, followed by APP0 and APP1 section (FF E1 + length + 'Exif\0\0' + data) which contains the TIFF structure (49 49 / 4D 4D + data)
		let marker = this.file.getUint16(0)
		let FileParser
		if (marker === TIFF_LITTLE_ENDIAN || marker === TIFF_BIG_ENDIAN) {
			this.file.isTiff = true
			FileParser = fileParsers.get('tiff')
		} else if (marker === JPEG_SOI) {
			this.file.isJpeg = true
			FileParser = fileParsers.get('jpeg')
		} else if (isHeic(this.file)) {
			// NOTE: most parsers check if bytes 4-8 are 'ftyp' and then if 8-12 is one of heic/heix/hevc/hevx/heim/heis/hevm/hevs/mif1/msf1
			//       but bytes 20-24 are actually always 'heic' for all of these formats
			this.file.isHeic = true
			FileParser = fileParsers.get('heic')
		} else {
			throw new Error(`Unknown file format`)
		}
		this.fileParser = new FileParser(this.options, this.file, this.parsers)
	}

	async read(arg) {
		this.file = await read(arg, this.options)
	}

	async parse() {
		this.setup()
		await this.fileParser.parse()

		let output = {}
		let {mergeOutput} = this.options
		let promises = Object.values(this.parsers).map(async parser => {
			let parserOutput = await parser.parse()
			if ((mergeOutput || parser.constructor.mergeOutput) && typeof parserOutput !== 'string')
				Object.assign(output, parserOutput)
			else
				output[parser.constructor.type] = parserOutput
		})
		await Promise.all(promises)
		output = undefinedIfEmpty(output)

		if (this.file.close) this.file.close()
		return output
	}

	async extractThumbnail() {
		this.setup()
		let TiffParser = segmentParsers.get('tiff', this.options)
		if (this.file.isTiff)
			var seg = {start: 0, type: 'tiff'}
		else
			var seg = await this.fileParser.getOrFindSegment('tiff')
		if (seg === undefined) return
		let chunk = await this.fileParser.ensureSegmentChunk(seg)
		let parser = this.parsers.tiff = new TiffParser(chunk, this.options, this.file)
		let thumb = await parser.extractThumbnail()
		if (this.file.close) this.file.close()
		return thumb
	}

}
