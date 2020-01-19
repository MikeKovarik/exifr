import Exifr from '../index.mjs'
import {promises as fs} from 'fs'


// only extract the XMP segment and nothing more than is necessary.
// i.e. Only finds TIFF segments and reads pointers, lengths, bypasses the rest
// and jumps straight to XMP segment. Ignores GPS, Thumbnail info, IPTC, etc...
let options = {xmp: true}
// Read the file from disk and feed the buffer into exifr with given options.
fs.readFile('../test/fixtures/cookiezen.jpg')
	.then(buffer => Exifr.parse(buffer, options))
	// NOTE ABOUT XMP: XML string is returned because exifr doesn't include XML parsing.
	// You can use XML parser of your choice to post process XMP data.
	.then(console.log)
	.catch(console.error)
