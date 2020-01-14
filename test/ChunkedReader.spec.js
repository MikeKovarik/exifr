import {assert, isNode, isBrowser} from './test-util.js'
import {getPath, getFile, btoa} from './test-util.js'
import {FsReader} from '../src/file-readers/FsReader.js'
import {BlobReader} from '../src/file-readers/BlobReader.js'
import {UrlFetcher} from '../src/file-readers/UrlFetcher.js'
import {Base64Reader} from '../src/file-readers/Base64Reader.js'
import Exifr from '../src/index-full.js'
import {createBlob} from './reader.spec.js'
import {createBase64Url} from './reader.spec.js'


describe('ChunkedReader', () => {

	function testReaderClass(fileWrapper, ReaderClass) {

		let file1 = {
			name: 'IMG_20180725_163423.jpg',
			size: 4055536,
		}

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

		let file2 = {
			name: 'noexif.jpg',
			size: 8318,
		}

		before(async () => {
			file1.input = await fileWrapper(file1.name)
			file2.input = await fileWrapper(file2.name)
		})


		it(`reads initial chunk`, async () => {
			let file = new ReaderClass(file1.input, {firstChunkSize})
			await file.readChunked()
			assert.equal(file.byteLength, firstChunkSize)
			assert.equal(file.getUint8(0), 0xFF)
			assert.equal(file.getUint8(1), 0xD8)
			if (file.close) await file.close()
		})

		describe('readChunked()', () => {

			it(`reading overlapping chunk does not negatively affect orignal view`, async () => {
				let file = new ReaderClass(file1.input, options)
				await file.readChunked()
				assert.equal(file.getUint8(0), 0xFF)
				assert.equal(file.getUint8(1), 0xD8)
				assert.equal(file.getUint8(2), 0xFF)
				assert.equal(file.getUint8(3), 0xE1)
				let tiffChunk = await file.readChunk(tiffOffset, tiffLength)
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
				if (file.close) await file.close()
			})

			it(`reading additional chunks keeps extending original view`, async () => {
				let file = new ReaderClass(file1.input, options)
				await file.readChunked()
				let tiffChunk = await file.readChunk(tiffOffset, tiffLength)
				assert.equal(tiffChunk.byteLength, tiffLength)
				assert.equal(file.byteLength, tiffEnd)
				let jfifChunk = await file.readChunk(jfifOffset, jfifLength)
				assert.equal(jfifChunk.byteLength, jfifLength)
				assert.equal(file.byteLength, jfifEnd)
				if (file.close) await file.close()
			})

			it(`reading sparsely creates second range`, async () => {
				let file = new ReaderClass(file1.input, options)
				await file.readChunked()
				assert.equal(file.ranges.list[0].end, firstChunkSize)
				assert.lengthOf(file.ranges.list, 1)
				let jfifChunk = await file.readChunk(jfifOffset, jfifLength)
				assert.equal(file.ranges.list[1].end, jfifOffset + jfifLength)
				assert.lengthOf(file.ranges.list, 2)
				assert.equal(jfifChunk.byteLength, jfifLength)
				assert.equal(file.byteLength, jfifEnd)
				if (file.close) await file.close()
			})

			it(`space between sparse segments does not contain useful data`, async () => {
				let file = new ReaderClass(file1.input, options)
				await file.readChunked()
				await file.readChunk(jfifOffset, jfifLength)
				assert.notEqual(file.getUint32(jfifOffset - 4), 0x5c47ffd9)
				assert.equal(file.getUint32(jfifOffset), 0xffe00010)
				if (file.close) await file.close()
			})

			it(`reading beyond the end of file doesn't throw or malform the view`, async () => {
				let file = new ReaderClass(file1.input, options)
				await file.readChunked()
				let chunkSize = 20
				let chunk = await file.readChunk(file1.size - chunkSize, chunkSize * 2)
				assert.equal(chunk.byteLength, chunkSize)
				assert.equal(file.byteLength, file1.size)
				assert.equal(file.getUint32(file1.size - 4), 0xAC7FFFD9)
				if (file.close) await file.close()
			})

		})

		describe('readWhole()', () => {

			it(`space between segments contains useful data`, async () => {
				let file = new ReaderClass(file1.input, options)
				await file.readWhole()
				assert.equal(file.getUint32(jfifOffset - 4), 0x5c47ffd9)
				assert.equal(file.getUint32(jfifOffset), 0xffe00010)
				assert.equal(file.getUint32(file1.size - 4), 0xAC7FFFD9)
			})

			it(`fallback from firstChunk of chunked mode results in fully read file`, async () => {
				let file = new ReaderClass(file1.input, options)
				await file.readChunked()
				await file.readWhole()
				assert.equal(file.getUint32(jfifOffset - 4), 0x5c47ffd9)
				assert.equal(file.getUint32(jfifOffset), 0xffe00010)
				assert.equal(file.getUint32(file1.size - 4), 0xAC7FFFD9)
				await file.close()
			})

		})


		describe('synthetic chunk reading', () => {

			let options = {
				firstChunkSize: 10
			}

			it('read chunk 0-500 (out of 8318)', async () => {
				let offset = 0
				let length = 500
				let reader = new ReaderClass(file2.input, options)
				await reader.readChunked()
				let chunk = await reader.readChunk(offset, length)
				assert.equal(chunk.byteLength, length)
				await reader.close()
			})

			it('read chunk 8000-8500 (out of 8318)', async () => {
				let offset = 8000
				let length = 500
				let reader = new ReaderClass(file2.input, options)
				await reader.readChunked()
				let chunk = await reader.readChunk(offset, length)
				assert.isNumber(reader.size)
				assert.equal(chunk.byteLength, 318)
				await reader.close()
			})

			it('read chunk 8000-8500 & 8500-9000 (out of 8318) returns appropriate length', async () => {
				let length = 500
				let reader = new ReaderClass(file2.input, options)
				await reader.readChunked()
				let chunk1 = await reader.readChunk(8000, length)
				let chunk2 = await reader.readChunk(8500, length)
				assert.isNumber(reader.size)
				assert.equal(chunk1.byteLength, 318)
				assert.isUndefined(chunk2)
				await reader.close()
			})

			it('read chunk 9000-9500 (out of 8318) returns undefined', async () => {
				let offset = 9000
				let length = 500
				let reader = new ReaderClass(file2.input, options)
				await reader.readChunked()
				let chunk = await reader.readChunk(offset, length)
				assert.isUndefined(chunk)
				await reader.close()
			})

		})

		describe('runtime safe-checks', () => {

			it('.readNextChunk() returns false when last chunk was read', async () => {
				let chunkSize = 3000
				let reader = new ReaderClass(file2.input, {
					firstChunkSize: chunkSize,
					chunkSize: chunkSize,
				})
				await reader.readChunked()
				assert.equal(reader.byteLength, chunkSize * 1)
				let canKeepReading1 = await reader.readNextChunk()
				assert.isTrue(canKeepReading1)
				assert.equal(reader.byteLength, chunkSize * 2)
				let canKeepReading2 = await reader.readNextChunk()
				assert.isFalse(canKeepReading2)
				assert.equal(reader.byteLength, file2.size)
				assert.equal(reader.size, file2.size)
				await reader.close()
			})

			it('.nextChunkOffset tops up at file size', async () => {
				let chunkSize = 5000
				let reader = new ReaderClass(file2.input, {
					firstChunkSize: chunkSize,
					chunkSize: chunkSize,
				})
				await reader.readChunked()
				// we dont know the the file size yet so we fall back to defaut chunk size
				assert.equal(reader.nextChunkOffset, chunkSize)
				await reader.readNextChunk()
				assert.equal(reader.nextChunkOffset, file2.size)
				await reader.close()
			})

			it(`.chunksRead is 5 when reading ${file2.size} by chunkSize 2000 - only read necessary ammount of chunks`, async () => {
				let chunkSize = 2000
				let exifr = new Exifr({
					firstChunkSize: chunkSize,
					chunkSize: chunkSize,
				})
				await exifr.read(file2.input)
				await exifr.parse(file2.input)
				assert.equal(exifr.file.chunksRead, 5)
				assert.equal(exifr.file.size, file2.size)
				await exifr.file.close()
			})

		})

	}



	isNode && describe('FsReader', () => {
		testReaderClass(getPath, FsReader)
	})

	isBrowser && describe('UrlFetcher', () => {
		testReaderClass(getPath, UrlFetcher)
	})

	isBrowser && describe('BlobReader', () => {
		testReaderClass(createBlob, BlobReader)
	})

	describe('Base64Reader', () => {

		testReaderClass(createBase64Url, Base64Reader)

		it(`'YWJj' readChunk() should return 'abc'`, async () => {
			let base64 = 'YWJj' //btoa('abc')
			let reader = new Base64Reader(base64, {})
			let chunk = await reader.readChunk()
			assert.equal(chunk.byteLength, 3)
			assert.equal(chunk.getString(), 'abc')
		})
		it(`'YWJj' readChunk(0, 1) should return 'a'`, async () => {
			let base64 = 'YWJj' //btoa('abc')
			let reader = new Base64Reader(base64, {})
			let chunk = await reader.readChunk(0, 1)
			assert.equal(chunk.byteLength, 1)
			assert.equal(chunk.getString(), 'a')
		})
		it(`'YWJj' readChunk(1, 1) should return 'b'`, async () => {
			let base64 = 'YWJj' //btoa('abc')
			let reader = new Base64Reader(base64, {})
			let chunk = await reader.readChunk(1, 1)
			assert.equal(chunk.byteLength, 1)
			assert.equal(chunk.getString(), 'b')
		})
		it(`'YWJj' readChunk(1) should return 'bc'`, async () => {
			let base64 = 'YWJj' //btoa('abc')
			let reader = new Base64Reader(base64, {})
			let chunk = await reader.readChunk(1)
			assert.equal(chunk.byteLength, 2)
			assert.equal(chunk.getString(), 'bc')
		})
		it(`'YWJjZGVmZ2hp' readChunk(3, 3) should return 'def'`, async () => {
			let base64 = 'YWJjZGVmZ2hp'
			let reader = new Base64Reader(base64, {})
			let chunk = await reader.readChunk(3, 3)
			assert.equal(chunk.byteLength, 3)
			assert.equal(chunk.getString(), 'def')
		})
		it(`'YWJjZGVmZ2hp' readChunk(4, 1) should return 'e'`, async () => {
			let base64 = 'YWJjZGVmZ2hp'
			let reader = new Base64Reader(base64, {})
			let chunk = await reader.readChunk(4, 1)
			assert.equal(chunk.byteLength, 1)
			assert.equal(chunk.getString(), 'e')
		})
	})


	it(`reading simple .jpg file sequentially`, async () => {
		let name = 'IMG_20180725_163423.jpg'
		let tiffOffset = 2
		let tiffLength = 25386
		let firstChunkSize = tiffOffset + Math.round(tiffLength / 2)
		let options = {wholeFile: false, firstChunkSize, wholeFile: false, mergeOutput: false, exif: true, gps: true}
		let exifr = new Exifr(options)
		await exifr.read(getPath(name))
		assert.isAtLeast(exifr.file.byteLength, 12695)
		assert.isAtLeast(exifr.file.byteLength, exifr.file.ranges.list[0].end)
		let output = await exifr.parse()
		await exifr.file.close()
		assert.instanceOf(output.gps.GPSLatitude, Array)
	})

	it(`issue-metadata-extractor-65.jpg - file with multisegment icc - should read all segments`, async () => {
		/*
		issue-metadata-extractor-65.jpg 567kb
		√ tiff     | offset       2 | length    4321 | end    4323 | <Buffer ff e1 10 df 45 78 69 66 00 00 4d 4d 00 2a>
		√ iptc     | offset    4323 | length    6272 | end   10595 | <Buffer ff ed 18 7e 50 68 6f 74 6f 73 68 6f 70 20>
		√ xmp      | offset   10595 | length    3554 | end   14149 | <Buffer ff e1 0d e0 68 74 74 70 3a 2f 2f 6e 73 2e>
		√ icc      | offset   14149 | length   65508 | end   79657 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
		√ icc      | offset   79657 | length   65508 | end  145165 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
		√ icc      | offset  145165 | length   65508 | end  210673 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
		√ icc      | offset  210673 | length   65508 | end  276181 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
		√ icc      | offset  276181 | length   65508 | end  341689 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
		√ icc      | offset  341689 | length   65508 | end  407197 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
		√ icc      | offset  407197 | length   65508 | end  472705 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
		√ icc      | offset  472705 | length   65508 | end  538213 | <Buffer ff e2 ff e2 49 43 43 5f 50 52 4f 46 49 4c>
		√ icc      | offset  538213 | length   33266 | end  571479 | <Buffer ff e2 81 f0 49 43 43 5f 50 52 4f 46 49 4c>
		? Adobed   | offset  571479 | length      16 | end  571495 | <Buffer ff ee 00 0e 41 64 6f 62 65 00 64 00 00 00>
		*/
		let input = await getPath('issue-metadata-extractor-65.jpg')
		let exifr = new Exifr({icc: true, firstChunkSize: 14149  + 100})
		await exifr.read(input)
		await exifr.parse()
		await exifr.file.close()
		assert.isAtLeast(exifr.fileParser.appSegments.length, 9, 'Should find all 9 ICC segments')
	})

	describe(`001.tif - reading scattered (IFD0 pointing to the end of file)`, async () => {

		it(`input path & {wholeFile: false, firstChunkSize: 100}`, async () => {
			let input = await getPath('001.tif')
			let options = {wholeFile: false, firstChunkSize: 100}
			let exifr = new Exifr(options)
			await exifr.read(input)
			let output = await exifr.parse()
			await exifr.file.close()
			assert.equal(output.Make, 'DJI')
		})

		it(`input path & {wholeFile: false}`, async () => {
			let input = await getPath('001.tif')
			let options = {wholeFile: true}
			let exifr = new Exifr(options)
			await exifr.read(input)
			let output = await exifr.parse()
			await exifr.file.close()
			assert.equal(output.Make, 'DJI')
		})

		it(`input buffer & no options`, async () => {
			let input = await getFile('001.tif')
			let exifr = new Exifr()
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
				let exifr = new Exifr(options)
				await exifr.read(input)
				let output = await exifr.parse()
				await exifr.file.close()
				assert.isObject(output)
			})

			it(`reads fixture ${fileName} with all segments enabled`, async () => {
				let input = await getPath(fileName)
				let options = {wholeFile: false, mergeOutput: false, firstChunkSize: 100, xmp: true, icc: true, iptc: true}
				let exifr = new Exifr(options)
				await exifr.read(input)
				let output = await exifr.parse()
				await exifr.file.close()
				assert.isObject(output)
			})

			if (segKeys) {

				it(`reads fixture ${fileName} with specific segments: ${segKeys.join(', ')}`, async () => {
					let input = await getPath(fileName)
					let options = {wholeFile: false, mergeOutput: false, firstChunkSize: 100}
					for (let segKey of segKeys) options[segKey] = true
					let exifr = new Exifr(options)
					await exifr.read(input)
					let output = await exifr.parse()
					await exifr.file.close()
					assert.isObject(output)
					for (let segKey of segKeys) assert.exists(output[segKey], `${segKey} doesnt exist`)
				})

				it(`reads fixture ${fileName} with specific segments: ${segKeys.join(', ')}`, async () => {
					let input = await getPath(fileName)
					//let input = await getFile(fileName)
					let options = {mergeOutput: false, firstChunkSize: 100}
					for (let segKey of segKeys) options[segKey] = true
					let exifr = new Exifr(options)
					await exifr.read(input)
					let output = await exifr.parse()
					await exifr.file.close()
					assert.isObject(output)
					for (let segKey of segKeys) assert.exists(output[segKey], `${segKey} doesnt exist`)
				})

			}

		}

	})

})
