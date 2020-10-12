// node --experimental-modules enumerate-segments.js
import * as exifr from '../src/bundles/full.mjs'
//import * as exifr from '../dist/full.esm.mjs'
import {promises as fs} from 'fs'
import path from 'path'


async function main() {
	let filePath = '../test/fixtures/jpg-heic-pair/IMG_6996.HEIC'
	//let filePath = '../test/fixtures/heic-iphone7.heic'
	let fileBuffer = await fs.readFile(filePath)
	let output = await exifr.parse(fileBuffer)
    console.log(output.errors)
}

main().catch(console.error)