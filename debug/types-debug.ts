import Exifr from '../index'

async function main() {
	let input = Buffer.from([])
	let options = {mergeOutput: false, icc: true}
	let output = await Exifr.parse(input, options)
	console.log(output.iptc)
}

main()