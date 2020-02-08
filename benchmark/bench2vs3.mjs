import {promises as fs} from 'fs'
import bench from './benchlib.js'
import exifr2 from './fixtures/exifr@2.1.1.cjs'
//import * as exifr3 from '../index.mjs'
import * as exifr3 from '../src/index-full.js'


main()

async function main() {
	let filePath = '../test/fixtures/IMG_20180725_163423.jpg'
	let fileBuffer = await fs.readFile(filePath)
	console.time('exifr3')
	let options = {
		xmp: false,
		icc: false,
		iptc: false,
		tiff: true,
		exif: true,
		gps: true,
		interop: false,
		thumbnail: false,
		// wat
		chunked: false
	}
	await bench('exifr2 parse buffer', async () => {
		await exifr2.parse(fileBuffer, options)
	})
	await bench('exifr3 parse buffer', async () => {
		await exifr3.parse(fileBuffer, options)
	})
	/*
	await bench('exifr2 parse path', async () => {
		await exifr2.parse(filePath, options)
	})
	await bench('exifr3 parse path', async () => {
		await exifr3.parse(filePath, options)
	})
	*/
}

export async function bench(name, cb, iterations = 10) {
	let i = 0
	let t1
	let t2
	let times = []
	let skipCount = 5
	//let skipCount = Math.ceil(iterations * 0.4)
	let steps = iterations + skipCount
	for (; i <= steps; i++) {
		global.benchTimes = []
		t1 = performance.now()
		await cb()
		t2 = performance.now()
		if (i > skipCount) {
			times.push(t2 - t1)
			if (global.benchTimes.length) {
				console.log(`----------- iteration ${i} -------------`)
				let nameLengths = Math.max(...global.benchTimes.map(record => record[0].length))
				for (let [name, time] of global.benchTimes)
					console.log(name.padEnd(nameLengths, ' '), ms(time - t1))
			}
		}
	}
	console.log(name, ms(times.reduce((a,b) => a + b, 0) / iterations))
	//console.log(name, times.map(time => time.toFixed(2)).join(' '))
}

function ms(time) {
	return time.toFixed(2) + ' ms'
}


global.recordBenchTime = name => global.benchTimes.push([name, performance.now()])