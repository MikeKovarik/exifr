import './util/debug.js'
import {ExifParser} from './parser.js'
export * from './parser.js'
//export defaultOptions from './options.js'
export {tags} from './tags.js'
import {GPS_LATREF, GPS_LAT, GPS_LONREF, GPS_LON} from './parsers/tiff.js'
import optionsFactory from './options.js'
import {hasBuffer} from './util/BufferView.js'


export {optionsFactory}

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

export async function thumbnail(arg, options = {}) {
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

export async function thumbnailUrl(...args) {
	let arrayBuffer = await thumbnail(...args)
	if (arrayBuffer !== undefined) {
		let blob = new Blob([arrayBuffer])
		return URL.createObjectURL(blob)
	}
}
