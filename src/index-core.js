import './util/debug.js' // TODO: DELETEME: TO BE REMOVED BEFORE RELEASING
import {ExifParser} from './exifr.js'
import {segmentParsers} from './parser.js'
export {tagKeys, tagValues, tagRevivers} from './tags.js'
import {GPS_LATREF, GPS_LAT, GPS_LONREF, GPS_LON} from './segment-parsers/tiff.js'
import optionsFactory from './options.js'
import {hasBuffer} from './util/BufferView.js'


export * from './exifr.js'

export default class Exifr {

	static optionsFactory = optionsFactory
	static segmentParsers = segmentParsers

	static async parse(arg, options) {
		let exifr = new ExifParser(options)
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
		let exifr = new ExifParser(options)
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
		let exifr = new ExifParser(options)
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

}
