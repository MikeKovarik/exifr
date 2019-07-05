import {ExifParser} from './src/parser.mjs'
export {ExifParser}
export {defaultOptions} from './src/options.mjs'

export async function parse(arg, options) {
	let parser = new ExifParser(options)
	await parser.read(arg)
	if (parser.tiffPosition === undefined) return
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
	let blob = new Blob([arrayBuffer])
	return URL.createObjectURL(blob)
}
