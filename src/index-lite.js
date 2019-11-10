import './util/debug.js'
import {ExifParser} from './parser.js'
export * from './parser.js'
//export defaultOptions from './options.js'
export {tags} from './tags.js'
import {GPS_LATREF, GPS_LAT, GPS_LONREF, GPS_LON} from './parsers/tiff.js'

export async function parse(arg, options) {
	let exifr = new ExifParser(options)
	await exifr.read(arg)
	return exifr.parse()
}


export async function parseGps(arg) {
	let options = {
		exif: false,
		gps: true,
		pickTags: [GPS_LATREF, GPS_LAT, GPS_LONREF, GPS_LON],
		// turning off all unnecessary steps and transformation to get the needed data ASAP
		sanitize: false,
		reviveValues: true,
		translateTags: false,
		mergeOutput: false,
	}
	let exifr = new ExifParser(options)
	await exifr.read(arg)
	let output = await exifr.parse()
	return output.tiff.gps
	/*
	let {latitude, longitude} = output.tiff.gps
	return {latitude, longitude}
	*/
}

export async function parseAppSegments(arg, options) {
	// TODO
}

export async function thumbnailBuffer(arg, options = {}) {
	options.thumbnail = true
	options.mergeOutput = true
	let exifr = new ExifParser(options)
	await exifr.read(arg)
	return exifr.extractThumbnail()
}

export async function thumbnailUrl(...args) {
	let arrayBuffer = await thumbnailBuffer(...args)
	if (arrayBuffer !== undefined) {
		let blob = new Blob([arrayBuffer])
		return URL.createObjectURL(blob)
	}
}
