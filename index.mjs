import {ExifParser} from './src/parser.mjs'

export default async function(...args) {
	let instance = new ExifParser()
	await instance.read(...args)
	// close FS file handle just in case it's still open
	if (instance.reader) instance.reader.destroy()
	return instance.getResult()
}