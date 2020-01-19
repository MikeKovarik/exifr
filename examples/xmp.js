import Exifr from '../index.mjs'
import {promises as fs} from 'fs'


// Exifr does not come with XMP parser out of the box, because those are heavy & complicated
// and not everyone needs to parse XMP/XML. So to keep exifr simple, we just extract the XMP string
// and you have to parse it yourself.

// Exifr offers you an API for using your own XML parser while parsing XMP.
// 1) get the XmlParser class.
let XmpParser = Exifr.segmentParsers.get('xmp')
// 2) Implement parseXml() method which takes one string argument
//    and returns anything that ends up as output.xmp.
XmpParser.prototype.parseXml = function(xmpString) {
	return 'Bring Your Own XML parser here: ' + xmpString
}

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
