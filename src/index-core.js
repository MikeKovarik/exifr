import './util/debug.js' // TODO: DELETEME: TO BE REMOVED BEFORE RELEASING
import {read} from './reader.js'
import {segmentParsers} from './parser.js'
export {tagKeys, tagValues, tagRevivers} from './tags.js'
import optionsFactory from './options.js'
import {hasBuffer} from './util/BufferView.js'
import {GPS_LATREF, GPS_LAT, GPS_LONREF, GPS_LON} from './segment-parsers/tiff.js'
import {TIFF_LITTLE_ENDIAN, TIFF_BIG_ENDIAN} from './segment-parsers/tiff.js'
import {undefinedIfEmpty} from './util/helpers.js'
import {TiffFileParser} from './file-parsers/tif.js'
import {JpegFileParser} from './file-parsers/jpg.js'


const JPEG_SOI = 0xffd8

export default class Exifr {

	// ------------------------- STATIC -------------------------

	static optionsFactory = optionsFactory
	static segmentParsers = segmentParsers

	static async parse(arg, options) {
		let exifr = new Exifr(options)
		await exifr.read(arg)
		return exifr.parse()
	}

	static async parseGps(arg) {
		let options = {
			ifd0: false,
			exif: false,
			gps: [GPS_LATREF, GPS_LAT, GPS_LONREF, GPS_LON],
			interop: false,
			thumbnail: false,
			// turning off all unnecessary steps and transformation to get the needed data ASAP
			sanitize: false,
			reviveValues: true,
			translateKeys: false,
			mergeOutput: false,
		}
		let exifr = new Exifr(options)
		await exifr.read(arg)
		let output = await exifr.parse()
		console.log('output', output)
		console.log('exifr.tiff', exifr.tiff)
		//console.log('exifr.tiff.gps', exifr.tiff.gps)
		let {latitude, longitude} = exifr.tiff.gps
		return {latitude, longitude}
	}

	static async parseAppSegments(arg, options) {
		// TODO
	}

	static async thumbnail(arg, options = {}) {
		options.thumbnail = true
		options.mergeOutput = true
		let exifr = new Exifr(options)
		await exifr.read(arg)
		let uint8array = await exifr.extractThumbnail()
		if (uint8array && hasBuffer)
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

	// ------------------------- INSTANCE -------------------------

	parsers = {}

	constructor(options) {
		this.options = optionsFactory(options)
	}

	setup() {
		//global.recordBenchTime(`exifr.parse()`)
		if (this.fileParser) return
		// JPEG's exif is based on TIFF structure from .tif files.
		// .tif files start with either 49 49 (LE) or 4D 4D (BE) which is also header for the TIFF structure.
		// JPEG starts with with FF D8, followed by APP0 and APP1 section (FF E1 + length + 'Exif\0\0' + data) which contains the TIFF structure (49 49 / 4D 4D + data)
		var marker = this.file.getUint16(0)
		this.file.isTiff = marker === TIFF_LITTLE_ENDIAN || marker === TIFF_BIG_ENDIAN
		//this.isJpeg = marker === JPEG_SOI
		let FileParser = this.file.isTiff ? TiffFileParser : JpegFileParser
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

		if (this.file.destroy) /*await*/ this.file.destroy()
		return output
	}

	async extractThumbnail() {
		this.setup()
		let TiffParser = segmentParsers.getSafe('tiff', this.options)
		if (this.file.isTiff)
			var seg = {start: 0, type: 'tiff'}
		else
			var seg = await this.fileParser.getOrFindSegment('tiff')
		if (seg === undefined) return
		let chunk = await this.fileParser.ensureSegmentChunk(seg)
		let parser = this.parsers.tiff = new TiffParser(chunk, this.options, this.file)
		return parser.extractThumbnail()
	}

}
