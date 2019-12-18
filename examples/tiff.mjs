import Exifr from '../index.js'
import {promises as fs} from 'fs'

fs.readFile('../test/fixtures/001.tif')
	.then(buffer => Exifr.parse(buffer))
	.then(console.log)
	.catch(console.error)

Exifr.parse('../test/fixtures/001.tif', true) // force parsing anything and everything
	.then(console.log)
	.catch(console.error)
