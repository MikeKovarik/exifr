// Exports from the depths of the library
export {Exifr} from './Exifr.mjs'
// for advanced users
export * from './options.mjs'
export {fileParsers, segmentParsers, fileReaders} from './plugins.mjs'
export {tagKeys, tagValues, tagRevivers, createDictionary, extendDictionary} from './tags.mjs'
// undocumented, needed for demo page and tests
export {fetchUrlAsArrayBuffer, readBlobAsArrayBuffer} from './reader.mjs'

// High level API.
import * as platform from './util/platform.mjs'
import {Buffer} from './util/platform.mjs'
import {Exifr} from './Exifr.mjs'
import {thumbnailOnlyOptions, gpsOnlyOptions, orientationOnlyOptions} from './options.mjs'
import {TAG_ORIENTATION} from './tags.mjs'


export async function parse(input, options) {
	let exr = new Exifr(options)
	await exr.read(input)
	return exr.parse()
}

export async function thumbnail(input) {
	let exr = new Exifr(thumbnailOnlyOptions)
	await exr.read(input)
	let u8arr = await exr.extractThumbnail()
	if (u8arr && platform.hasBuffer)
		return Buffer.from(u8arr)
	else
		return u8arr
}

// only available in browser
export async function thumbnailUrl(input) {
	let u8arr = await this.thumbnail(input)
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