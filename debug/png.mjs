// node --experimental-modules enumerate-segments.js
import * as exifr from '../src/bundles/full.mjs'
//import * as exifr from '../dist/full.esm.mjs'
import {promises as fs} from 'fs'
import path from 'path'


async function main() {
	//let filePath = '../test/fixtures/png/with-xmp.png'
	//let filePath = '../test/fixtures/png/IMG_20180725_163423-1.png'
	//let filePath = '../test/fixtures/png/IMG_20180725_163423-2.png'
	let filePath = '../test/fixtures/img_1771_with_exif.png'
	let fileBuffer = await fs.readFile(filePath)
	let output = await exifr.parse(fileBuffer, {xmp: true, icc: true})
    console.log('#'.repeat(60))
    console.log(output)
}

main().catch(console.error)