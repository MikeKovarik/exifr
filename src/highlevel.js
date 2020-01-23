import {gpsOnlyOptions} from './options.js'
import * as platform from './util/platform.js'
import {Exifr} from './Exifr.js'


export async function parse(input, options) {
	let exr = new Exifr(options)
	await exr.read(input)
	return exr.parse()
}

export async function thumbnail(input, options = {}) {
	options.thumbnail = true
	options.mergeOutput = true
	let exr = new Exifr(options)
	await exr.read(input)
	let uint8array = await exr.extractThumbnail()
	if (uint8array && platform.hasBuffer)
		return Buffer.from(uint8array)
	else
		return uint8array
}

// only available in browser
export async function thumbnailUrl(...args) {
	let uint8array = await this.thumbnail(...args)
	if (uint8array !== undefined) {
		let blob = new Blob([uint8array.buffer])
		return URL.createObjectURL(blob)
	}
}

export async function gps(input) {
	let exr = new Exifr(gpsOnlyOptions)
	await exr.read(input)
	let output = await exr.parse()
	let {latitude, longitude} = output.gps
	return {latitude, longitude}
}