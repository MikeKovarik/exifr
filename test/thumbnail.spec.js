import {assert} from './test-util.js'
import {getFile, isBrowser} from './test-util.js'
import {ExifParser, thumbnail, thumbnailUrl} from '../src/index-full.js'


describe('thumbnail', () => {

    let options = {
        thumbnail: true,
        mergeOutput: false,
    }

	describe('ExifParser#extractThumbnail()', () => {

		it(`returns (instance of) Uint8Array of thumbnail`, async () => {
			let input = await getFile('img_1771.jpg')
			let exifr = new ExifParser(options)
			await exifr.read(input)
			var thumb = await exifr.extractThumbnail()
			assert.instanceOf(thumb, Uint8Array)
		})

		it(`returns correct thumbnail data`, async () => {
			let input = await getFile('img_1771.jpg')
			let exifr = new ExifParser(options)
			await exifr.read(input)
			var thumb = await exifr.extractThumbnail()
			// jpeg
			assert.equal(thumb[0], 0xff)
			assert.equal(thumb[1], 0xd8)
			// thumbnail data
			assert.equal(thumb[2], 0xff)
			assert.equal(thumb[3], 0xdb)
			assert.equal(thumb[4], 0x00)
			assert.equal(thumb[5], 0x84)
			assert.equal(thumb[6], 0x00)
		})

		it(`returns thumbnail of correct length`, async () => {
			let input = await getFile('img_1771.jpg')
			let exifr = new ExifParser(options)
			await exifr.read(input)
			var thumb = await exifr.extractThumbnail()
			assert.equal(thumb.byteLength, 5448)
		})

		it(`returns thumbnail (forced after mergeOutput)`, async () => {
			let input = await getFile('img_1771.jpg')
			let exifr = new ExifParser({mergeOutput: true})
			await exifr.read(input)
			var output = await exifr.extractThumbnail()
			output = new Uint8Array(output)
			assert.equal(output[0], 0xff)
			assert.equal(output[1], 0xd8)
		})

		it(`returns thumbnail (default)`, async () => {
			let input = await getFile('img_1771.jpg')
			let exifr = new ExifParser()
			await exifr.read(input)
			var output = await exifr.extractThumbnail()
			output = new Uint8Array(output)
			assert.equal(output[0], 0xff)
			assert.equal(output[1], 0xd8)
		})

		it(`returns undefined if there's no exif`, async () => {
			let input = await getFile('img_1771_no_exif.jpg')
			let exifr = new ExifParser()
			await exifr.read(input)
			var output = await exifr.extractThumbnail()
			assert.isUndefined(output)
		})

		it(`returns undefined if there's no exif 2`, async () => {
			let input = await getFile('noexif.jpg')
			let exifr = new ExifParser()
			await exifr.read(input)
			var output = await exifr.extractThumbnail()
			assert.isUndefined(output)
		})

		it(`returns undefined if there's no thumbnail`, async () => {
			let input = await getFile('PANO_20180725_162444.jpg')
			let exifr = new ExifParser()
			await exifr.read(input)
			var output = await exifr.extractThumbnail()
			assert.isUndefined(output)
		})

    })

    it(`exifr.thumbnail()`, async () => {
        let input = await getFile('img_1771.jpg')
        var output = await thumbnail(input, options)
        // Buffer in Node, ArrayBuffer in browser
        output = new Uint8Array(output)
        assert.equal(output[0], 0xff)
        assert.equal(output[1], 0xd8)
    })

    isBrowser && it(`exifr.thumbnailUrl()`, async () => {
        let input = await getFile('img_1771.jpg')
        var url = await thumbnailUrl(input, options)
        assert.typeOf(url, 'string')
    })

})
