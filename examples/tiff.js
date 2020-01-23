import Exifr from '../src/index-full.js' // 'import 'exifr'
import {promises as fs} from 'fs'

let options = true // force parsing anything and everything

fs.readFile('../test/fixtures/001.tif')
	.then(buffer => Exifr.parse(buffer, options))
	.then(console.log)
	.catch(console.error)

Exifr.parse('../test/fixtures/001.tif', options)
	.then(console.log)
	.catch(console.error)
