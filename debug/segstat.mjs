// node --experimental-modules enumerate-segments.js
import {Exifr} from '../src/bundles/full.mjs'
import {promises as fs} from 'fs'
import path from 'path'


let sizes = new Map

let options = {
	stopAfterSos: false,
	recordJpegSegments: true,
	recordUnknownSegments: true,
}

//let dirPath = 'C:/Users/m.kovarik/Desktop/deleteme/fixtures'
//let dirPath = 'C:/Users/m.kovarik/Desktop/deleteme/all'
let dirPath = '../test/fixtures'
handleFile('door-knocker.jpg')
/*
fs.readdir(dirPath).then(async files => {
    let promises = files
		.filter(fileName => isJpeg(fileName))
		.map(handleFile)
	await Promise.all(promises)
	for (let [segType, segSizes] of sizes) {
		console.log('------------------------------')
		segSizes = segSizes.sort((a,b) => a - b)
		console.log(segType.toUpperCase())
		console.log('average', logKb(avg(segSizes)))
		console.log(segSizes.map(size => toOneDecimal(size / 1024)).join(', '))
    }
})
*/
function isJpeg(fileName) {
	fileName = fileName.toLowerCase()
	return fileName.endsWith('.jpg')
		|| fileName.endsWith('.jpg')
}

async function handleFile(fileName) {
	try {
		let filePath = dirPath + '/' + fileName
		let fileBuffer = await fs.readFile(filePath)
		let exr = new Exifr(options)
		await exr.read(fileBuffer)
		exr.setup()
		await exr.fileParser.findAppSegments(0, true)
		let {appSegments} = exr.fileParser
		let names = appSegments.map(getSegmentName)
		console.log(fileName.padEnd(50, ' '), names.join(' '))
		for (let seg of appSegments) {
			let arr = sizes.get(seg.type) || []
			arr.push(seg.length || seg.size)
			sizes.set(seg.type, arr)
		}
	} catch(err) {
		console.log('ERROR', fileName)
		console.log(err)
	}
}

function getSegmentName(seg) {
	if (seg.type) {
		return seg.type.toUpperCase()
	} else if (seg.marker !== undefined) {
		let code = seg.marker.toString(16)
		return markerNames[code] || code
	} else {
		return '?'
	}
}

function logKb(arg) {
	if (typeof arg === 'number')
		var l = arg
	else
		var l = arg.byteLength ? arg.byteLength : arg.length
	return toOneDecimal(l / 1024).toString().padStart(4, ' ') + ' kb '
}

function toOneDecimal(num) {
	return Number(num.toFixed(1))
}

function avg(arr) {
	let result = 0
	for (let item of arr)
		result += item
	return result / arr.length
}
