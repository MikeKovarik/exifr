import './util-debug.mjs'
import {ExifParser} from './parser.mjs'
export * from './parser.mjs'
export {defaultOptions} from './options.mjs'
export {tags} from './tags.mjs'

export async function parse(arg, options) {
	let parser = new ExifParser(options)
	await parser.read(arg)
	return parser.parse()
}

export async function thumbnailBuffer(arg, options = {}) {
	let parser = new ExifParser(options)
	await parser.read(arg)
	if (parser.tiffPosition === undefined) return
	return parser.extractThumbnail()
}

export async function thumbnailUrl(...args) {
	let arrayBuffer = await thumbnailBuffer(...args)
	if (arrayBuffer !== undefined) {
		let blob = new Blob([arrayBuffer])
		return URL.createObjectURL(blob)
	}
}
