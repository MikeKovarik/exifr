import * as exifr from '../index'
import exifrDefault from '../index'

async function main() {
	let input = Buffer.from([])
	let options = {mergeOutput: false, icc: true}
	let output = await exifr.parse(input, options)
	console.log(output.iptc)
	console.log(output.GPano.Data)
	exifr.parse('', {})
	exifr.parse('')
	exifr.parse('', ['foo'])
	exifr.orientation('').then(or => console.log(or))
	let parser = exifr.segmentParsers.get('exif')
	let {longitude, latitude} = parser.gps(Buffer.from([0, 0]))
	exifrDefault.parse('', {})
	exifrDefault.parse('')
	exifrDefault.parse('', ['foo'])
	exifrDefault.orientation('').then(or => console.log(or))

	exifr.parse('../test/fixtures/002.tiff')
	exifr.parse('../test/fixtures/002.tiff', true)
	exifr.parse('../test/fixtures/002.tiff', {tiff: true})
	exifr.parse('../test/fixtures/002.tiff', {xmp: {parse: false}})
	exifr.parse('../test/fixtures/002.tiff', {tiff: true, ifd0: {translateValues: false}})

	exifr.thumbnail('../test/fixtures/002.tiff', 'no second argument');
	exifr.thumbnailUrl('../test/fixtures/002.tiff', 'no second argument');
	exifr.gps('../test/fixtures/002.tiff', 'no second argument');
	exifr.orientation('../test/fixtures/002.tiff', 'no second argument');
	exifr.rotation('../test/fixtures/002.tiff', 'no second argument');

	exifr.sidecar('../test/fixtures/002.tiff');
	exifr.sidecar('../test/fixtures/002.tiff', 'second argument must be object');
	exifr.sidecar('../test/fixtures/002.tiff', {});
	exifr.sidecar('../test/fixtures/002.tiff', {}, 'tiff');
	exifr.sidecar('../test/fixtures/002.tiff', {}, 'tiff', 'no fourth arg');
}

main()