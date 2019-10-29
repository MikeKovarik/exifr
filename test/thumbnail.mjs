import {ExifParser, thumbnailBuffer, thumbnailUrl} from '../index.mjs'
import {assert, isBrowser} from './test-util.mjs'
import {getFile} from './test-util.mjs'


describe('thumbnail', () => {

    let options = {
        thumbnail: true,
        mergeOutput: false,
    }

    it(`#extractThumbnail() returns Buffer or ArrayBuffer of thumbnail`, async () => {
        let intput = await getFile('IMG_20180725_163423.jpg')
        let parser = new ExifParser(options)
        await parser.read(intput)
        var output = await parser.extractThumbnail()
        output = new Uint8Array(output)
        assert.equal(output[0], 0xff)
        assert.equal(output[1], 0xd8)
    })

    it(`#extractThumbnail() returns Buffer or ArrayBuffer of thumbnail (forced after with mergeOutput)`, async () => {
        let intput = await getFile('IMG_20180725_163423.jpg')
        let parser = new ExifParser(true)
        await parser.read(intput)
        var output = await parser.extractThumbnail()
        output = new Uint8Array(output)
        assert.equal(output[0], 0xff)
        assert.equal(output[1], 0xd8)
    })

    it(`#extractThumbnail() returns Buffer or ArrayBuffer of thumbnail (default)`, async () => {
        let intput = await getFile('IMG_20180725_163423.jpg')
        let parser = new ExifParser()
        await parser.read(intput)
        var output = await parser.extractThumbnail()
        output = new Uint8Array(output)
        assert.equal(output[0], 0xff)
        assert.equal(output[1], 0xd8)
    })

    it(`#extractThumbnail() returns undefined if there's no exif`, async () => {
        let intput = await getFile('cookiezen.jpg')
        let parser = new ExifParser()
        await parser.read(intput)
        var output = await parser.extractThumbnail()
        assert.isUndefined(output)
    })

    it(`#extractThumbnail() returns undefined if there's no thumbnail`, async () => {
        let intput = await getFile('noexif.jpg')
        let parser = new ExifParser(options)
        await parser.read(intput)
        assert.isUndefined(await parser.extractThumbnail())
    })

    it(`thumbnailBuffer()`, async () => {
        let intput = await getFile('IMG_20180725_163423.jpg')
        var output = await thumbnailBuffer(intput, options)
        // Buffer in Node, ArrayBuffer in browser
        output = new Uint8Array(output)
        assert.equal(output[0], 0xff)
        assert.equal(output[1], 0xd8)
    })

    isBrowser && it(`thumbnailUrl()`, async () => {
        let intput = await getFile('IMG_20180725_163423.jpg')
        var url = await thumbnailUrl(intput, options)
        assert.typeOf(url, 'string')
    })

})
