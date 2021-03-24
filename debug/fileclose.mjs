import * as exifr from '../src/bundles/full.mjs'
import {promises as fs} from 'fs'


function fileFilter(name) {
	name = name.toLowerCase()
	return name.endsWith('.png')
		|| name.endsWith('.jpg')
		|| name.endsWith('.jpeg')
		|| name.endsWith('.heic')
		|| name.endsWith('.heif')
		|| name.endsWith('.tif')
		|| name.endsWith('.tiff')
}

let dir = '../test/fixtures'


async function main() {
	let names = (await fs.readdir(dir)).filter(fileFilter)
	let paths = names.map(name => dir + '/' + name)
    console.log('paths', paths)
	let promises = paths.map(path => exifr.parse(path, true))
	await Promise.all(promises)
	console.log('DONE')
}


main().catch(console.error)

setTimeout(() => {
	console.log('timeout')
}, 2000)