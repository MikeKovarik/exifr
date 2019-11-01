import './util/debug.mjs'
import {ExifParser} from './parser.mjs'
export * from './parser.mjs'
export {defaultOptions} from './options.mjs'
export {tags} from './tags.mjs'

export async function parse(arg, options) {
	let exifr = new ExifParser(options)
	await exifr.read(arg)
	return exifr.parse()
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
