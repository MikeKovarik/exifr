import {assert} from './test-util.js'
import {getPath, getFile} from './test-util.js'
import {FsReader} from '../src/reader.js'
import {ExifParser} from '../src/index-full.js'


describe('ChunkedReader', () => {

	const path = getPath('IMG_20180725_163423.jpg')

	const tiffOffset = 2
	const tiffLength = 25386
	const tiffEnd    = tiffOffset + tiffLength

	const jfifOffset = 25388
	const jfifLength = 18
	const jfifEnd    = jfifOffset + jfifLength

	const ifd0Pointer = 8
	const exifPointer = 239
	const gpsPointer = 18478

	const seekChunkSize = 10
	const options = {wholeFile: false, seekChunkSize}

	describe('FsReader', () => {

		it(`reads initial chunk`, async () => {
			let view = new FsReader(path, {seekChunkSize})
			await view.readChunked()
			assert.equal(view.byteLength, seekChunkSize)
			assert.equal(view.getUint8(0), 0xFF)
			assert.equal(view.getUint8(1), 0xD8)
		})

		describe('readChunked()', () => {

			it(`reading overlapping chunk does not negatively affect orignal view`, async () => {
				let view = new FsReader(path, options)
				await view.readChunked()
				assert.equal(view.getUint8(0), 0xFF)
				assert.equal(view.getUint8(1), 0xD8)
				assert.equal(view.getUint8(2), 0xFF)
				assert.equal(view.getUint8(3), 0xE1)
				let tiffChunk = await view.readChunk(tiffOffset, tiffLength)
				assert.equal(view.getUint8(0), 0xFF)
				assert.equal(view.getUint8(1), 0xD8)
				assert.equal(view.getUint8(2), 0xFF)
				assert.equal(view.getUint8(3), 0xE1)
				assert.equal(view.getUint8(13), 0x49)
				assert.equal(view.getUint8(14), 0x2a)
				assert.equal(tiffChunk.getUint8(0), 0xFF)
				assert.equal(tiffChunk.getUint8(1), 0xE1)
				assert.equal(tiffChunk.getUint8(11), 0x49)
				assert.equal(tiffChunk.getUint8(12), 0x2a)
			})

			it(`reading additional chunks keeps extending original view`, async () => {
				let view = new FsReader(path, options)
				await view.readChunked()
				let tiffChunk = await view.readChunk(tiffOffset, tiffLength)
				assert.equal(tiffChunk.byteLength, tiffLength)
				assert.equal(view.byteLength, tiffEnd)
				let jfifChunk = await view.readChunk(jfifOffset, jfifLength)
				assert.equal(jfifChunk.byteLength, jfifLength)
				assert.equal(view.byteLength, jfifEnd)
			})

			it(`reading sparsely creates second range`, async () => {
				let view = new FsReader(path, options)
				await view.readChunked()
				assert.equal(view.ranges[0].end, seekChunkSize)
				assert.lengthOf(view.ranges, 1)
				let jfifChunk = await view.readChunk(jfifOffset, jfifLength)
				assert.equal(view.ranges[1].end, jfifOffset + jfifLength)
				assert.lengthOf(view.ranges, 2)
				assert.equal(jfifChunk.byteLength, jfifLength)
				assert.equal(view.byteLength, jfifEnd)
			})

			it(`space between sparse segments does not contain useful data`, async () => {
				let view = new FsReader(path, options)
				await view.readChunked()
				await view.readChunk(jfifOffset, jfifLength)
				assert.notEqual(view.getUint32(jfifOffset - 4), 0x5c47ffd9)
				assert.equal(view.getUint32(jfifOffset), 0xffe00010)
			})

		})

		describe('readWhole()', () => {

			it(`space between segments contains useful data`, async () => {
				let view = new FsReader(path, options)
				await view.readWhole()
				assert.equal(view.getUint32(jfifOffset - 4), 0x5c47ffd9)
				assert.equal(view.getUint32(jfifOffset), 0xffe00010)
			})

		})

	})

	it(`reading simple .jpg file sequentially`, async () => {
		let seekChunkSize = tiffOffset + Math.round(tiffLength / 2)
		let options = {wholeFile: false, seekChunkSize, wholeFile: false, mergeOutput: false, exif: true, gps: true}
		let exifr = new ExifParser(options)
		await exifr.read(path)
		assert.isAtLeast(exifr.file.byteLength, 12695)
		assert.isAtLeast(exifr.file.byteLength, exifr.file.ranges[0].end)
		let output = await exifr.parse()
		assert.instanceOf(output.gps.GPSLatitude, Array)
	})

	describe(`001.tif - reading scattered (IFD0 pointing to the end of file)`, async () => {

		it(`input path & {wholeFile: false}`, async () => {
			let input = await getPath('001.tif')
			let options = {wholeFile: false, seekChunkSize: 100}
			let exifr = new ExifParser(options)
			await exifr.read(input)
			let output = await exifr.parse()
			assert.equal(output.Make, 'DJI')
		})

		it(`input path & {wholeFile: false}`, async () => {
			let input = await getPath('001.tif')
			let options = {wholeFile: true}
			let exifr = new ExifParser(options)
			await exifr.read(input)
			let output = await exifr.parse()
			assert.equal(output.Make, 'DJI')
		})

		it(`input buffer & no options`, async () => {
			let input = await getFile('001.tif')
			let exifr = new ExifParser()
			await exifr.read(input)
			let output = await exifr.parse()
			assert.equal(output.Make, 'DJI')
		})

	})

	describe('reads file with small seekChunkSize', () => {

		describe(`small file (32kb)`, async () => {
			testChunkedFile('tif-with-iptc-icc-xmp.tif', ['exif', 'xmp', 'iptc', 'icc'])
		})

		describe(`regular files`, async () => {
			testChunkedFile('001.tif', ['exif', 'xmp'])
			testChunkedFile('002.tiff', ['exif', 'xmp'])
			testChunkedFile('issue-exif-js-124.tiff', ['exif', 'xmp'])
			testChunkedFile('issue-metadata-extractor-152.tif', ['exif', 'xmp'])
		})

		function testChunkedFile(fileName, segKeys) {

			it(`reads fixture ${fileName} with default settings`, async () => {
				let input = await getPath(fileName)
				let options = {wholeFile: false, mergeOutput: false, seekChunkSize: 100}
				let exifr = new ExifParser(options)
				await exifr.read(input)
				let output = await exifr.parse()
				assert.isObject(output)
			})

			it(`reads fixture ${fileName} with all segments enabled`, async () => {
				let input = await getPath(fileName)
				let options = {wholeFile: false, mergeOutput: false, seekChunkSize: 100, xmp: true, icc: true, iptc: true}
				let exifr = new ExifParser(options)
				await exifr.read(input)
				let output = await exifr.parse()
				assert.isObject(output)
			})

			if (segKeys) {

				it(`reads fixture ${fileName} with specific segments: ${segKeys.join(', ')}`, async () => {
					let input = await getPath(fileName)
					let options = {wholeFile: false, mergeOutput: false, seekChunkSize: 100}
					for (let segKey of segKeys) options[segKey] = true
					let exifr = new ExifParser(options)
					await exifr.read(input)
					let output = await exifr.parse()
					assert.isObject(output)
					for (let segKey of segKeys) assert.exists(output[segKey], `${segKey} doesnt exist`)
				})

				it(`reads fixture ${fileName} with specific segments: ${segKeys.join(', ')}`, async () => {
					let input = await getFile(fileName)
					let options = {mergeOutput: false, seekChunkSize: 100}
					for (let segKey of segKeys) options[segKey] = true
					let exifr = new ExifParser(options)
					await exifr.read(input)
					let output = await exifr.parse()
					assert.isObject(output)
					for (let segKey of segKeys) assert.exists(output[segKey], `${segKey} doesnt exist`)
				})

			}

		}

	})

})
