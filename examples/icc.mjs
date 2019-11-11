// node --experimental-modules enumerate-segments.js
import {parse} from '../src/index-full.js'
import {promises as fs} from 'fs'

//fs.readFile('../test/fixtures/IMG_20180725_163423.jpg')
fs.readFile('../test/fixtures/issue-fast-exif-2.jpg')
	.then(async buffer => {
		const output = await parse(buffer, {icc: true, mergeOutput: false})
		console.log('output', output.icc)
	})
