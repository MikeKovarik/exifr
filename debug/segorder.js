// node --experimental-modules enumerate-segments.js
import {Exifr} from '../src/bundles/full.mjs'
import {createReadStream, promises as fs} from 'fs'
import path from 'path'


const markerNames = {
	e0: 'APP0',
	e1: 'APP1',
	e2: 'APP2',
	e3: 'APP3',
	e4: 'APP4',
	e5: 'APP5',
	e6: 'APP6',
	e7: 'APP7',
	e8: 'APP8',
	e9: 'APP9',
	ea: 'APP10',
	eb: 'APP11',
	ec: 'APP12',
	ed: 'APP13',
	ee: 'APP14',
	ef: 'APP15',

	c0: 'SOF0',
	c2: 'SOF2',
	c4: 'DHT',
	db: 'DQT',
	dd: 'DRI',
	da: 'SOS',
	fe: 'COMMENT',
	d8: 'SOI',
	d9: 'EOI',
	fe: '???',
}

//let dirPath = '../test/fixtures'
//let dirPath = 'C:/Users/m.kovarik/Desktop/deleteme/fixtures'
let dirPath = 'C:/Users/m.kovarik/Desktop/deleteme/from-metadata-extractor'

let options = {
	stopAfterSos: false,
	recordJpegSegments: true,
	recordUnknownSegments: true,
}

fs.readdir(dirPath).then(async files => {
    for (let fileName of files) {
		if (!isJpeg(fileName)) continue
		await handleFile(fileName)
    }
})

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
		let {appSegments, jpegSegments, unknownSegments} = exr.fileParser
		let allSegments = [...appSegments/*, ...jpegSegments*/, ...unknownSegments]
		let names = allSegments.map(getSegmentName)
		console.log(fileName.padEnd(50, ' '), names.join(' '))
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

//handleFile('BonTonARTSTORplusIPTC.jpg')