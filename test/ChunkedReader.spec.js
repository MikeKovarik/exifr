import {assert, isNode, isBrowser} from './test-util.js'
import {getPath, getFile} from './test-util.js'
import {FsReader, BlobReader} from '../src/reader.js'
import {ExifParser} from '../src/index-full.js'
import {createBlob} from './reader.spec.js'


describe('ChunkedReader', () => {

	const name = 'IMG_20180725_163423.jpg'
	const path = getPath(name)

	const tiffOffset = 2
	const tiffLength = 25386
	const tiffEnd    = tiffOffset + tiffLength

	const jfifOffset = 25388
	const jfifLength = 18
	const jfifEnd    = jfifOffset + jfifLength

	const ifd0Pointer = 8
	const exifPointer = 239
	const gpsPointer = 18478

	const firstChunkSize = 10
	const options = {wholeFile: false, firstChunkSize}

	function testReaderClass(input, ReaderClass) {
		describe(ReaderClass.name, () => {

			before(async () => input = await input)

			it(`reads initial chunk`, async () => {
				let file = new ReaderClass(input, {firstChunkSize})
				await file.readChunked()
				assert.equal(file.byteLength, firstChunkSize)
				assert.equal(file.getUint8(0), 0xFF)
				assert.equal(file.getUint8(1), 0xD8)
				if (file.destroy) await file.destroy()
			})

			describe('readChunked()', () => {

				it(`reading overlapping chunk does not negatively affect orignal view`, async () => {
					let file = new ReaderClass(input, options)
					console.log('file', file.toString())
					await file.readChunked()
					console.log('file', file.toString())
					assert.equal(file.getUint8(0), 0xFF)
					assert.equal(file.getUint8(1), 0xD8)
					assert.equal(file.getUint8(2), 0xFF)
					assert.equal(file.getUint8(3), 0xE1)
					let tiffChunk = await file.readChunk(tiffOffset, tiffLength)
					console.log('file', file.toString())
					assert.equal(file.getUint8(0), 0xFF)
					assert.equal(file.getUint8(1), 0xD8)
					assert.equal(file.getUint8(2), 0xFF)
					assert.equal(file.getUint8(3), 0xE1)
					assert.equal(file.getUint8(13), 0x49)
					assert.equal(file.getUint8(14), 0x2a)
					assert.equal(tiffChunk.getUint8(0), 0xFF)
					assert.equal(tiffChunk.getUint8(1), 0xE1)
					assert.equal(tiffChunk.getUint8(11), 0x49)
					assert.equal(tiffChunk.getUint8(12), 0x2a)
					if (file.destroy) await file.destroy()
				})

				it(`reading additional chunks keeps extending original view`, async () => {
					let file = new ReaderClass(input, options)
					console.log('0', file.toString())
					await file.readChunked()
					console.log('1', file.toString())
					let tiffChunk = await file.readChunk(tiffOffset, tiffLength)
					console.log('2', file.toString())
					assert.equal(tiffChunk.byteLength, tiffLength)
					console.log('3', file.toString())
					assert.equal(file.byteLength, tiffEnd)
					console.log('4', file.toString())
					let jfifChunk = await file.readChunk(jfifOffset, jfifLength)
					assert.equal(jfifChunk.byteLength, jfifLength)
					assert.equal(file.byteLength, jfifEnd)
					if (file.destroy) await file.destroy()
				})

				it(`reading sparsely creates second range`, async () => {
					let file = new ReaderClass(input, options)
					await file.readChunked()
					assert.equal(file.ranges[0].end, firstChunkSize)
					assert.lengthOf(file.ranges, 1)
					let jfifChunk = await file.readChunk(jfifOffset, jfifLength)
					assert.equal(file.ranges[1].end, jfifOffset + jfifLength)
					assert.lengthOf(file.ranges, 2)
					assert.equal(jfifChunk.byteLength, jfifLength)
					assert.equal(file.byteLength, jfifEnd)
					if (file.destroy) await file.destroy()
				})

				it(`space between sparse segments does not contain useful data`, async () => {
					let file = new ReaderClass(input, options)
					await file.readChunked()
					await file.readChunk(jfifOffset, jfifLength)
					assert.notEqual(file.getUint32(jfifOffset - 4), 0x5c47ffd9)
					assert.equal(file.getUint32(jfifOffset), 0xffe00010)
					if (file.destroy) await file.destroy()
				})

			})

			describe('readWhole()', () => {

				it(`space between segments contains useful data`, async () => {
					let file = new ReaderClass(input, options)
					await file.readWhole()
					assert.equal(file.getUint32(jfifOffset - 4), 0x5c47ffd9)
					assert.equal(file.getUint32(jfifOffset), 0xffe00010)
				})

			})

		})
	}


	isNode && testReaderClass(path, FsReader)
	isBrowser && testReaderClass(createBlob(path), BlobReader)


	it(`reading simple .jpg file sequentially`, async () => {
		let firstChunkSize = tiffOffset + Math.round(tiffLength / 2)
		let options = {wholeFile: false, firstChunkSize, wholeFile: false, mergeOutput: false, exif: true, gps: true}
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
			let options = {wholeFile: false, firstChunkSize: 100}
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

	describe('reads file with small firstChunkSize', () => {

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
				let options = {wholeFile: false, mergeOutput: false, firstChunkSize: 100}
				let exifr = new ExifParser(options)
				await exifr.read(input)
				let output = await exifr.parse()
				assert.isObject(output)
			})

			it(`reads fixture ${fileName} with all segments enabled`, async () => {
				let input = await getPath(fileName)
				let options = {wholeFile: false, mergeOutput: false, firstChunkSize: 100, xmp: true, icc: true, iptc: true}
				let exifr = new ExifParser(options)
				await exifr.read(input)
				let output = await exifr.parse()
				assert.isObject(output)
			})

			if (segKeys) {

				it(`reads fixture ${fileName} with specific segments: ${segKeys.join(', ')}`, async () => {
					let input = await getPath(fileName)
					let options = {wholeFile: false, mergeOutput: false, firstChunkSize: 100}
					for (let segKey of segKeys) options[segKey] = true
					let exifr = new ExifParser(options)
					await exifr.read(input)
					let output = await exifr.parse()
					assert.isObject(output)
					for (let segKey of segKeys) assert.exists(output[segKey], `${segKey} doesnt exist`)
				})

				it(`reads fixture ${fileName} with specific segments: ${segKeys.join(', ')}`, async () => {
					let input = await getFile(fileName)
					let options = {mergeOutput: false, firstChunkSize: 100}
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
