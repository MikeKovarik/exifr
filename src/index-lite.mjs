import './util/debug.mjs'
import {ExifParser} from './parser.mjs'
export * from './parser.mjs'
export {defaultOptions} from './options.mjs'
export {tags} from './tags.mjs'
import {GPS_LATREF, GPS_LAT, GPS_LONREF, GPS_LON} from './parsers/tiff.mjs'

export async function parse(arg, options) {
	let exifr = new ExifParser(options)
	let res = await exifr.read(arg)
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
	let exifr = new ExifParser(options)
	await exifr.read(arg)
	if (exifr.tiffPosition === undefined) return
	return exifr.extractThumbnail()
}

export async function thumbnailUrl(...args) {
	let arrayBuffer = await thumbnailBuffer(...args)
	if (arrayBuffer !== undefined) {
		let blob = new Blob([arrayBuffer])
		return URL.createObjectURL(blob)
	}
}
