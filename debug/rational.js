// node --experimental-modules enumerate-segments.js
import {promises as fs} from 'fs'
import path from 'path'
import {Exifr} from '../src/bundles/full.mjs'

let dir = '../test/fixtures/'

async function parseFile(fileName) {
	console.log('---------------------------')
	console.log(fileName)
	let filePath = path.join(dir, fileName)
	let buffer = await fs.readFile(filePath)
	const output = await Exifr.parse(buffer, {ifd0: false, gps: false})
	console.log('ExposureTime     ', output.ExposureTime, '1/' + Math.round(1 / output.ExposureTime))
	console.log('ShutterSpeedValue', output.ShutterSpeedValue)
	/*
	console.log('CompressedBitsPerPixel', output.CompressedBitsPerPixel)
	console.log('FocalLength', output.FocalLength)
	console.log('FlashEnergy', output.FlashEnergy)
	console.log('FNumber', output.FNumber)
	console.log('ApertureValue', output.ApertureValue)
	console.log('MaxApertureValue', output.MaxApertureValue)
	console.log('BrightnessValue', output.BrightnessValue)
	console.log('ExposureBiasValue', output.ExposureBiasValue)
	console.log('SubjectDistance', output.SubjectDistance)
	*/
}

;(async () => {
/*
	for (let fileName of await fs.readdir(dir)) {
		await parseFile(fileName).catch(err => console.log(err))
	}
*/
	//await parseFile('img_1771.jpg')
	await parseFile('IMG_20180725_163423.jpg')
})()