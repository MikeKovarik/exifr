import {ExifParser} from './src/parser.mjs'
export * from './src/parser.mjs'
export {defaultOptions} from './src/options.mjs'

export async function parse(arg, options) {
	console.log('a')
	let parser = new ExifParser(options)
	console.log('b')
	await parser.read(arg)
	console.log('c')
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
