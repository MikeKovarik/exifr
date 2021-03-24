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
	let names = await fs.readdir(dir)
	let paths = names.map(name => dir + '/' + name)
	await Promise.all(paths.map(handleFile))
	console.log('DONE')
}

async function handleFile(path) {
	let stat = await fs.stat(path)
	if (stat.isDirectory()) return
	try {
		await exifr.parse(path, true)
	} catch(err) {
		console.log('ERROR', path)
		console.log(err)
	}
}

main().catch(console.error)

setTimeout(() => {
	console.log('timeout')
}, 2000)