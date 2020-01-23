import * as exifr from '../index'

async function main() {
	let input = Buffer.from([])
	let options = {mergeOutput: false, icc: true}
	let output = await exifr.parse(input, options)
	console.log(output.iptc)
}

main()