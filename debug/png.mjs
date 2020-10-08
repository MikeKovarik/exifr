// node --experimental-modules enumerate-segments.js
import * as exifr from '../src/bundles/full.mjs'
import {promises as fs} from 'fs'
import path from 'path'


async function main() {
	//let filePath = path.join('../test/fixtures/png/with-xmp.png')
	//let filePath = path.join('../test/fixtures/png/IMG_20180725_163423-1.png')
	let filePath = path.join('../test/fixtures/png/IMG_20180725_163423-2.png')
	let fileBuffer = await fs.readFile(filePath)
	let output = await exifr.parse(fileBuffer, {xmp: true, icc: true})
    console.log('#'.repeat(60))
    console.log(output)
}

main().catch(console.error)