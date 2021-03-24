import exifr from '../src/bundles/full.mjs'


//exifr.parse(process.argv[2] || '../../exifr-fixtures/11_146169.IIQ', {xmp: true})
exifr.parse(process.argv[2] || '../test/fixtures/001.tif', {xmp: true})
	.then(console.log)