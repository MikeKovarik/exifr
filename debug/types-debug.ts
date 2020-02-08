import * as exifr from '../index'

async function main() {
	let input = Buffer.from([])
	let options = {mergeOutput: false, icc: true}
	let output = await exifr.parse(input, options)
	console.log(output.iptc)
	exifr.parse('', {})
	let parser = exifr.segmentParsers.get('exif')
	let {longitude, latitude} = parser.gps(Buffer.from([0, 0]))
}

main()