import {ExifParser, thumbnailBuffer, thumbnailUrl} from '../index.mjs'
import {assert, isBrowser} from './test-util.mjs'
import {getFile} from './test-util.mjs'


describe('thumbnail', () => {

    let options = {
        thumbnail: true,
        mergeOutput: false,
    }

    it(`tiffParser.extractThumbnail() returns Buffer or ArrayBuffer of thumbnail`, async () => {
        let intput = await getFile('IMG_20180725_163423.jpg')
        let exifr = new ExifParser(options)
        await exifr.read(intput)
        var output = await exifr.extractThumbnail()
        output = new Uint8Array(output)
        assert.equal(output[0], 0xff)
        assert.equal(output[1], 0xd8)
    })

    it(`tiffParser.extractThumbnail() returns Buffer or ArrayBuffer of thumbnail (forced after with mergeOutput)`, async () => {
        let intput = await getFile('IMG_20180725_163423.jpg')
        let exifr = new ExifParser(true)
        await exifr.read(intput)
        var output = await exifr.extractThumbnail()
        output = new Uint8Array(output)
        assert.equal(output[0], 0xff)
        assert.equal(output[1], 0xd8)
    })

    it(`tiffParser.extractThumbnail() returns Buffer or ArrayBuffer of thumbnail (default)`, async () => {
        let intput = await getFile('IMG_20180725_163423.jpg')
        let exifr = new ExifParser()
        await exifr.read(intput)
        var output = await exifr.extractThumbnail()
        output = new Uint8Array(output)
        assert.equal(output[0], 0xff)
        assert.equal(output[1], 0xd8)
    })

    it(`tiffParser.extractThumbnail() returns undefined if there's no exif`, async () => {
        let intput = await getFile('cookiezen.jpg')
        let exifr = new ExifParser()
        await exifr.read(intput)
        var output = await exifr.extractThumbnail()
        assert.isUndefined(output)
    })

    it(`tiffParser.extractThumbnail() returns undefined if there's no thumbnail`, async () => {
        let intput = await getFile('noexif.jpg')
        let exifr = new ExifParser(options)
        await exifr.read(intput)
        assert.isUndefined(await exifr.extractThumbnail())
    })

    it(`exifr.thumbnailBuffer()`, async () => {
        let intput = await getFile('IMG_20180725_163423.jpg')
        var output = await thumbnailBuffer(intput, options)
        // Buffer in Node, ArrayBuffer in browser
        output = new Uint8Array(output)
        assert.equal(output[0], 0xff)
        assert.equal(output[1], 0xd8)
    })

    isBrowser && it(`exifr.thumbnailUrl()`, async () => {
        let intput = await getFile('IMG_20180725_163423.jpg')
        var url = await thumbnailUrl(intput, options)
        assert.typeOf(url, 'string')
    })

})
