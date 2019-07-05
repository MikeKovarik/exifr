import * as exifr from '../index.mjs'
import {promises as fs} from 'fs'

fs.readFile('../test/001.tif')
	.then(buffer => exifr.parse(buffer))
	.then(console.log)
	.catch(console.error)

exifr.parse('../test/001.tif', true) // force parsing anything and everything
	.then(console.log)
	.catch(console.error)
