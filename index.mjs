import {ExifParser} from './src/parser.mjs'

export default async function(...args) {
	let instance = new ExifParser()
	await instance.read(...args)
	return instance.getResult()
}