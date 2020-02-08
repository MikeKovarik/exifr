import {promises as fs} from 'fs'
import bench from './benchlib.js'
import * as exifrWithMaps from './fixtures/exifr3-full-map-dictionaries.js'
import * as exifrWithObjects from './fixtures/exifr3-full-object-dictionaries.js'


main()

async function main() {
	let filePath = '../test/fixtures/IMG_20180725_163423.jpg'
	let fileBuffer = await fs.readFile(filePath)
	let options = {
		tiff: true,
		icc: true,
		iptc: false,
		jfif: false,
		xmp: false,
	}
	await bench('exifr with object dictionaries', 500, async () => {
		await exifrWithObjects.parse(fileBuffer, options)
	})
	await bench('exifr with map dictionaries', 500, async () => {
		await exifrWithMaps.parse(fileBuffer, options)
	})
}