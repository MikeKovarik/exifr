import * as platform from './util/platform.js'
import {Exifr} from './Exifr.js'
import {gpsOnlyOptions, orientationOnlyOptions} from './options.js'
import {TAG_ORIENTATION} from './tags.js'


export async function parse(input, options) {
	let exr = new Exifr(options)
	await exr.read(input)
	return exr.parse()
}

export async function thumbnail(input, options = {}) {
	options.ifd1 = true
	options.mergeOutput = true
	let exr = new Exifr(options)
	await exr.read(input)
	let u8arr = await exr.extractThumbnail()
	if (u8arr && platform.hasBuffer)
		return Buffer.from(u8arr)
	else
		return u8arr
}

// only available in browser
export async function thumbnailUrl(...args) {
	let u8arr = await this.thumbnail(...args)
	if (u8arr !== undefined) {
		let blob = new Blob([u8arr]) // note: dont use AB directly, because of byteOffset
		return URL.createObjectURL(blob)
	}
}

export async function gps(input) {
	let exr = new Exifr(gpsOnlyOptions)
	await exr.read(input)
	let output = await exr.parse()
	if (output && output.gps) {
		let {latitude, longitude} = output.gps
		return {latitude, longitude}
	}
}

export async function orientation(input) {
	let exr = new Exifr(orientationOnlyOptions)
	await exr.read(input)
	let output = await exr.parse()
	if (output && output.ifd0) {
		return output.ifd0[TAG_ORIENTATION]
	}
}