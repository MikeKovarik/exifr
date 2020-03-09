import {promises as fs} from 'fs'
import bench from './benchlib.js'
import * as exifr from '../src/bundles/full.mjs'


main()

async function main() {
	let filePath = '../test/fixtures/IMG_20180725_163423.jpg'
	let fileBuffer = await fs.readFile(filePath)
	let options = {
		tiff: true,
		icc: false,
		iptc: false,
		jfif: false,
		xmp: false,
	}
	await bench('user reads file           ', 50, async () => {
		let tempBuffer = await fs.readFile(filePath)
		await exifr.parse(tempBuffer, options)
	})
	await bench('exifr reads whole file    ', 50, async () => {
		await exifr.parse(filePath, Object.assign({}, options, {chunked: false}))
	})
	await bench('exifr reads file by chunks', 50, async () => {
		await exifr.parse(filePath, Object.assign({}, options, {chunked: true}))
	})
	await bench('only parsing, not reading ', 50, async () => {
		await exifr.parse(fileBuffer, options)
	})
}