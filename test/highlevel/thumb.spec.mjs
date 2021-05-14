import {assert} from '../test-util-core.mjs'
import {getFile, getPath, isNode, isBrowser} from '../test-util-core.mjs'
import {Exifr} from '../../src/bundles/full.mjs'
import * as exifr from '../../src/bundles/full.mjs'


describe('thumbnail', () => {

	let fileName = 'img_1771.jpg'

    let options = {
        ifd1: true,
        mergeOutput: false,
    }

	function assertThumbnailData(thumb) {
		// jpeg
		assert.equal(thumb[0], 0xff)
		assert.equal(thumb[1], 0xd8)
		// thumbnail data
		assert.equal(thumb[2], 0xff)
		assert.equal(thumb[3], 0xdb)
		assert.equal(thumb[4], 0x00)
		assert.equal(thumb[5], 0x84)
		assert.equal(thumb[6], 0x00)
    }

	function assertThumbnailLength(thumb) {
		assert.equal(thumb.byteLength, 5448)
	}

	describe('Exifr#extractThumbnail()', () => {

		it(`returns instance of Uint8Array of thumbnail (on all platforms)`, async () => {
			let input = await getFile(fileName)
			let exr = new Exifr(options)
			await exr.read(input)
			var thumb = await exr.extractThumbnail()
			assert.instanceOf(thumb, Uint8Array)
		})

		it(`returns correct thumbnail data`, async () => {
			let input = await getFile(fileName)
			let exr = new Exifr(options)
			await exr.read(input)
			var thumb = await exr.extractThumbnail()
			assertThumbnailData(thumb)
		})

		it(`returns thumbnail of correct length`, async () => {
			let input = await getFile(fileName)
			let exr = new Exifr(options)
			await exr.read(input)
			var thumb = await exr.extractThumbnail()
			assertThumbnailLength(thumb)
		})

		it(`returns thumbnail (forced after mergeOutput)`, async () => {
			let input = await getFile(fileName)
			let exr = new Exifr({mergeOutput: true})
			await exr.read(input)
			var thumb = await exr.extractThumbnail()
			assertThumbnailData(thumb)
			assertThumbnailLength(thumb)
		})

		it(`returns thumbnail (default)`, async () => {
			let input = await getFile(fileName)
			let exr = new Exifr()
			await exr.read(input)
			var thumb = await exr.extractThumbnail()
			assertThumbnailData(thumb)
			assertThumbnailLength(thumb)
		})

		it(`returns undefined if there's no exif`, async () => {
			let input = await getFile('img_1771_no_exif.jpg')
			let exr = new Exifr()
			await exr.read(input)
			var thumb = await exr.extractThumbnail()
			assert.isUndefined(thumb)
		})

		it(`returns undefined if there's no exif 2`, async () => {
			let input = await getFile('noexif.jpg')
			let exr = new Exifr()
			await exr.read(input)
			var thumb = await exr.extractThumbnail()
			assert.isUndefined(thumb)
		})

		it(`returns undefined if there's no thumbnail`, async () => {
			let input = await getFile('issue-metadata-extractor-152.jpg')
			let exr = new Exifr()
			await exr.read(input)
			var thumb = await exr.extractThumbnail()
			assert.isUndefined(thumb)
		})

    })

    describe(`exifr.thumbnail()`, async () => {

		it(`returns thumbnail`, async () => {
			let input = await getFile(fileName)
			var thumb = await exifr.thumbnail(input)
			assertThumbnailData(thumb)
			assertThumbnailLength(thumb)
		})

		isBrowser && it(`returns Uint8Array in browser`, async () => {
			let input = await getFile(fileName)
			var thumb = await exifr.thumbnail(input)
			assert.instanceOf(thumb, Uint8Array)
		})

		isNode && it(`returns Buffer in node`, async () => {
			let input = await getFile(fileName)
			var thumb = await exifr.thumbnail(input)
			assert.instanceOf(thumb, Buffer)
		})

		it(`points to proper position in memory`, async () => {
			let input = await getFile(fileName)
			var u8arr = await exifr.thumbnail(input)
			assert.equal(u8arr.byteLength, 5448, 'thumbnail should be 5448 bytes long')
			assert.equal(u8arr[0], 255, 'thumbnail contains incorrect data')
			assert.equal(u8arr[1], 216, 'thumbnail contains incorrect data')
			assert.equal(u8arr[2], 255, 'thumbnail contains incorrect data')
			assert.equal(u8arr[3], 219, 'thumbnail contains incorrect data')
		})

    })

    isBrowser && describe(`exifr.thumbnailUrl()`, async () => {

		it(`returns string url`, async () => {
			let input = await getFile(fileName)
			var url = await exifr.thumbnailUrl(input)
			assert.typeOf(url, 'string')
			assert.isTrue(url.startsWith('blob:http'))
		})

		it(`points to proper position in memory`, async () => {
			let input = await getFile(fileName)
			var url = await exifr.thumbnailUrl(input)
			let arrayBuffer = await fetch(url).then(res => res.arrayBuffer())
			let u8arr = new Uint8Array(arrayBuffer)
			assert.equal(u8arr.byteLength, 5448, 'thumbnail should be 5448 bytes long')
			assert.equal(u8arr[0], 255, 'thumbnail contains incorrect data')
			assert.equal(u8arr[1], 216, 'thumbnail contains incorrect data')
			assert.equal(u8arr[2], 255, 'thumbnail contains incorrect data')
			assert.equal(u8arr[3], 219, 'thumbnail contains incorrect data')
		})

    })

})
