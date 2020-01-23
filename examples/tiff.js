import * as exifr from '../src/index-full.js' // 'import 'exifr'
import {promises as fs} from 'fs'

let options = true // force parsing anything and everything

fs.readFile('../test/fixtures/001.tif')
	.then(buffer => exifr.parse(buffer, options))
	.then(console.log)
	.catch(console.error)

exifr.parse('../test/fixtures/001.tif', options)
	.then(console.log)
	.catch(console.error)
