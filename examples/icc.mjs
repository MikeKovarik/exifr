// node --experimental-modules enumerate-segments.mjs
import {parse} from '../src/index-full.mjs'
import {promises as fs} from 'fs'

//fs.readFile('../test/fixtures/IMG_20180725_163423.jpg')
fs.readFile('../test/fixtures/fast-exif-issue-2.jpg')
	.then(async buffer => {
		const output = await parse(buffer, {icc: true, mergeOutput: false})
		console.log('output', output.icc)
	})
