import {assert} from './test-util.js'
import {getFile, getPath} from './test-util.js'
import Exifr from '../src/index-full.js'


describe('options', () => {

	describe('options.wholeFile', () => {

		let simpleFile = getPath('IMG_20180725_163423.jpg')

		// Exif is scattered throughout the file.
		// Header at the beginning of file, data at the end.
		// tiff offset at 0; ID0 offset at 677442
		let scatteredFile = getPath('001.tif')

		describe('wholeFile: true', () => {

			it(`does not have any effect if input is buffer`, async () => {
				let exifr = new Exifr({wholeFile: true})
				await exifr.read(await getFile(scatteredFile))
				assert.isNotTrue(exifr.file.chunked)
			})

			it(`simple file should be read as a whole`, async () => {
				let options = {wholeFile: true}
				let exifr = new Exifr(options)
				await exifr.read(simpleFile)
				assert.isFalse(exifr.file.chunked)
			})

			it(`scattered file should read as a whole`, async () => {
				let options = {wholeFile: true}
				let exifr = new Exifr(options)
				await exifr.read(scatteredFile)
				assert.isFalse(exifr.file.chunked)
			})

		})

		describe('wholeFile: undefined', () => {

			it(`does not have any effect if input is buffer`, async () => {
				let exifr = new Exifr({wholeFile: undefined})
				await exifr.read(await getFile(scatteredFile))
				assert.isNotTrue(exifr.file.chunked)
			})

			it(`simple file should be read in chunked mode`, async () => {
				let options = {wholeFile: undefined}
				let exifr = new Exifr(options)
				await exifr.read(simpleFile)
				assert.isTrue(exifr.file.chunked)
			})

			it(`scattered file should be read chunked mode`, async () => {
				let options = {wholeFile: undefined}
				let exifr = new Exifr(options)
				await exifr.read(scatteredFile)
				assert.isTrue(exifr.file.chunked)
			})

		})

		describe('wholeFile: false', () => {

			it(`does not have any effect if input is buffer`, async () => {
				let exifr = new Exifr({wholeFile: false})
				await exifr.read(await getFile(scatteredFile))
				assert.isNotTrue(exifr.file.chunked)
			})

			it(`simple file should be read chunked mode`, async () => {
				let options = {wholeFile: false}
				let exifr = new Exifr(options)
				await exifr.read(simpleFile)
				assert.isTrue(exifr.file.chunked)
			})

			it(`scattered file should be read chunked mode`, async () => {
				let options = {wholeFile: false}
				let exifr = new Exifr(options)
				await exifr.read(scatteredFile)
				assert.isTrue(exifr.file.chunked)
			})

		})

	})

})
