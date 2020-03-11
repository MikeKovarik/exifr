import * as exifr from '../src/core.mjs'
// We're in node.js so we'll be reading the file using 'fs' module
import '../src/file-readers/FsReader.mjs'
// We only have jpg files
import '../src/file-parsers/jpeg.mjs'
// And we're only parsing IPTC segment
import '../src/segment-parsers/iptc.mjs'
// So we only include IPTC dictionaries
import '../src/dicts/iptc-keys.mjs'
import '../src/dicts/iptc-values.mjs'

// We still need to tell exifr to not look for TIFF, which is true by default.
// And also enable IPTC which is disabled by default.
let options = {tiff: false, iptc: true}
let filePath = '../test/fixtures/iptc-independent-photographer-example.jpg'
exifr.parse(filePath, options)
	.then(output => console.log('output', output))

// This will fail because we didn't import TIFF segment parser.
exifr.parse(filePath, {tiff: true})
	.catch(err => console.log(err))