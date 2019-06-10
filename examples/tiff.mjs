import getExif from '../index.mjs'
import {promises as fs} from 'fs'

fs.readFile('../test/001.tif')
	.then(buffer => getExif(buffer))
	.then(console.log)
	.catch(console.error)
