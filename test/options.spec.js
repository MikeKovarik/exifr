import {assert} from './test-util.js'
import {getFile, getPath, isNode, isBrowser} from './test-util.js'
import {Options} from '../src/options.js'
import {Exifr} from '../src/index-full.js'


describe('options', () => {

	describe('option shorthands', () => {

		it(`(true) enables all tiff blocks`, async () => {
			let options = new Options(true)
			assert.isTrue(options.ifd0.enabled, 'IFD0 should be enabled')
			assert.isTrue(options.exif.enabled, 'EXIF should be enabled')
			assert.isTrue(options.gps.enabled, 'GPS should be enabled')
			assert.isTrue(options.interop.enabled, 'INTEROP should be enabled')
			assert.isTrue(options.thumbnail.enabled, 'THUMBNAIL should be enabled')
		})

		it(`(true) enables all tiff segments`, async () => {
			let options = new Options(true)
			assert.isTrue(options.tiff.enabled, 'TIFF should be enabled')
			assert.isTrue(options.jfif.enabled, 'JFIF should be enabled')
			assert.isTrue(options.iptc.enabled, 'IPTC should be enabled')
			assert.isTrue(options.xmp.enabled, 'XMP should be enabled')
			assert.isTrue(options.icc.enabled, 'ICC should be enabled')
		})

	})

	describe('options.firstChunkSize', () => {

		isNode && it(`firstChunkSizeNode is a standin for node`, async () => {
			let firstChunkSizeNode = 1234
			let options = new Options({firstChunkSizeNode})
			assert.equal(options.firstChunkSize, firstChunkSizeNode)
		})

		isBrowser && it(`firstChunkSizeBrowser is a standin for browser`, async () => {
			let firstChunkSizeBrowser = 1234
			let options = new Options({firstChunkSizeBrowser})
			assert.equal(options.firstChunkSize, firstChunkSizeBrowser)
		})

		it(`does not have any effect if input is buffer`, async () => {
			let size = 456
			let exr = new Exifr({firstChunkSize: size})
			await exr.read(await getPath('IMG_20180725_163423.jpg'))
			assert.equal(exr.file.byteLength, size)
			await exr.file.close()
		})

	})

	describe('options.chunkSize', () => {

		it(`affects size of the chunk following firstChunkSize`, async () => {
			let firstChunkSize = 101
			let chunkSize = 100
			let exr = new Exifr({firstChunkSize, chunkSize})
			await exr.read(await getPath('IMG_20180725_163423.jpg'))
			assert.equal(exr.file.byteLength, firstChunkSize)
			await exr.file.readNextChunk()
			assert.equal(exr.file.byteLength, firstChunkSize + chunkSize)
			await exr.file.close()
		})

	})
// This can't be tested
/*
	describe('options.chunkLimit', () => {

		it(`affects size of the chunk following firstChunkSize`, async () => {
			let firstChunkSize = 101
			let chunkSize = 10
			let chunkLimit = 5
			let exr = new Exifr({firstChunkSize, chunkSize, chunkLimit, tiff: false, icc: true, iptc: true})
			await exr.read(await getPath('IMG_20180725_163423.jpg'))
			await exr.parse()
			assert.equal(exr.file.byteLength, firstChunkSize + (chunkSize * chunkLimit))
		})

	})
*/
	describe('options.wholeFile', () => {

		let simpleFile = getPath('IMG_20180725_163423.jpg')

		// Exif is scattered throughout the file.
		// Header at the beginning of file, data at the end.
		// tiff offset at 0; ID0 offset at 677442
		let scatteredFileName = '001.tif'
		let scatteredFilePath = getPath(scatteredFileName)

		describe('wholeFile: true', () => {

			it(`does not have any effect if input is buffer`, async () => {
				let exr = new Exifr({wholeFile: true})
				await exr.read(await getFile(scatteredFileName))
				assert.isNotTrue(exr.file.chunked)
			})

			it(`simple file should be read as a whole`, async () => {
				let options = {wholeFile: true}
				let exr = new Exifr(options)
				await exr.read(simpleFile)
				assert.isFalse(exr.file.chunked)
				await exr.file.close()
			})

			it(`scattered file should read as a whole`, async () => {
				let options = {wholeFile: true}
				let exr = new Exifr(options)
				await exr.read(scatteredFilePath)
				assert.isFalse(exr.file.chunked)
				await exr.file.close()
			})

		})

		describe('wholeFile: undefined', () => {

			it(`does not have any effect if input is buffer`, async () => {
				let exr = new Exifr({wholeFile: undefined})
				await exr.read(await getFile(scatteredFileName))
				assert.isNotTrue(exr.file.chunked)
			})

			it(`simple file should be read in chunked mode`, async () => {
				let options = {wholeFile: undefined}
				let exr = new Exifr(options)
				await exr.read(simpleFile)
				assert.isTrue(exr.file.chunked)
				await exr.file.close()
			})

			it(`scattered file should be read chunked mode`, async () => {
				let options = {wholeFile: undefined}
				let exr = new Exifr(options)
				await exr.read(scatteredFilePath)
				assert.isTrue(exr.file.chunked)
				await exr.file.close()
			})

		})

		describe('wholeFile: false', () => {

			it(`does not have any effect if input is buffer`, async () => {
				let exr = new Exifr({wholeFile: false})
				await exr.read(await getFile(scatteredFileName))
				assert.isNotTrue(exr.file.chunked)
			})

			it(`simple file should be read chunked mode`, async () => {
				let options = {wholeFile: false}
				let exr = new Exifr(options)
				await exr.read(simpleFile)
				assert.isTrue(exr.file.chunked)
				await exr.file.close()
			})

			it(`scattered file should be read chunked mode`, async () => {
				let options = {wholeFile: false}
				let exr = new Exifr(options)
				await exr.read(scatteredFilePath)
				assert.isTrue(exr.file.chunked)
				await exr.file.close()
			})

		})

	})

})
