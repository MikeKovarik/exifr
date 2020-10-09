// node --experimental-modules enumerate-segments.js
//import * as exifr from '../src/bundles/full.mjs'
let exifr = require('../dist/full.umd.cjs')
let fs = require('fs').promises


async function main() {
	//let filePath = '../test/fixtures/png/with-xmp.png'
	//let filePath = '../test/fixtures/png/IMG_20180725_163423-1.png'
	let filePath = '../test/fixtures/png/IMG_20180725_163423-2.png'
	let fileBuffer = await fs.readFile(filePath)
	let output = await exifr.parse(fileBuffer, {xmp: true, icc: true})
    console.log('#'.repeat(60))
    console.log(output)
}

main().catch(console.error)