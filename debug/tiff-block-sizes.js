// node --experimental-modules enumerate-segments.js
import {Exifr} from '../src/bundles/full.mjs'
import {promises as fs} from 'fs'
import path from 'path'

function isJpg(fileName) {
	fileName = fileName.toLowerCase()
	return fileName.endsWith('.jpg')
		|| fileName.endsWith('.jpeg')
}

function isTif(fileName) {
	fileName = fileName.toLowerCase()
	return fileName.endsWith('.tiff')
		|| fileName.endsWith('.tif')
}

function isImage(fileName) {
	return isJpg(fileName) || isTif(fileName)
}

(async function() {
	let allFiles = await fs.readdir('../test/fixtures/')
	let imageFiles = allFiles.filter(isImage)
	//let imageFiles = ['tif-with-iptc-icc-xmp.tif']
	for (let fileName of imageFiles) {
		try {
			console.log('---------------------------------------------------')
			console.log(fileName)
			let filePath = path.join('../test/fixtures/', fileName)
			let fileBuffer = await fs.readFile(filePath)
			let exr = new Exifr({mergeOutput: false, tiff: true, ifd0: true, exif: true, gps: true, interop: true, thumbnail: true, xmp: true, iptc: true, icc: true, sanitize: true, translateKeys: false, translateValues: false})
			await exr.read(fileBuffer)
			let output = await exr.parse()
			if (isJpg(fileName)) {
				for (let seg of exr.fileParser.appSegments)
				console.log(padd(seg.type), logKb(seg.length || seg.size))
			}
			let tiff = exr.parsers.tiff
			if (tiff) {
				if (output.ifd0) console.log(padd('ifd0'), logKb(getLength(output.ifd0)))
				if (output.exif) console.log(padd('exif'), logKb(getLength(output.exif)))
				if (output.gps) console.log(padd('gps'), logKb(getLength(output.gps)))
				if (output.interop) console.log(padd('interop'), logKb(getLength(output.interop)))
				if (output.ifd1) console.log(padd('ifd1'), logKb(getLength(output.ifd1)))
				if (tiff.xmp)  console.log(padd('xmp'),  logKb(tiff.xmp))
				if (tiff.iptc) console.log(padd('iptc'), logKb(tiff.iptc))
				if (tiff.icc)  console.log(padd('icc'),  logKb(tiff.icc))
			}
		} catch(err) {
			console.log(err)
		}
	}
})()

function padd(arg) {
	return arg.padEnd(10, ' ')
}

function logKb(arg) {
	if (typeof arg === 'number')
		var l = arg
	else
		var l = arg.byteLength ? arg.byteLength : arg.length
	return (l / 1024).toFixed(1).toString().padStart(4, ' ') + ' kb ' + l
}

function getLength(blockObject) {
	let bytes = 0
	if (blockObject) {
		for (let [key, value] of Object.entries(blockObject)) {
			bytes += 2 // tag code
			bytes += 2 // tag type
			bytes += 4 // value count
			if (value instanceof Uint8Array)
				bytes += value.byteLength
			if (Array.isArray(value) && typeof value[0] === 'number')
				bytes += value.length
			else if (typeof value === 'string')
				bytes += value.length
			else
				bytes += 2 // average for unit16
		}
	}
	return bytes
}