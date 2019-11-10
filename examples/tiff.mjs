import * as exifr from '../index.js'
import {promises as fs} from 'fs'

fs.readFile('../test/fixtures/001.tif')
	.then(buffer => exifr.parse(buffer))
	.then(console.log)
	.catch(console.error)

exifr.parse('../test/fixtures/001.tif', true) // force parsing anything and everything
	.then(console.log)
	.catch(console.error)
