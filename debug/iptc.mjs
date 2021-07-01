// node --experimental-modules enumerate-segments.js
import * as exifr from '../src/bundles/full.mjs'
import {promises as fs} from 'fs'

let options = {tiff: false, iptc: true, mergeOutput: false}
//fs.readFile('../test/fixtures/iptc-staff-photographer-example.jpg')
//fs.readFile('../test/fixtures/BonTonARTSTORplusIPTC.jpg')
fs.readFile('../test/fixtures/iptc-mess.jpg')
	.then(async buffer => {
		const output = await exifr.parse(buffer, options)
		console.log(output.iptc)
	}).catch(console.error)