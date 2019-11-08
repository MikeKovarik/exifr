import {parse, Exifr} from '../index.mjs'
import {ChunkedReader, FsReader} from '../src/reader.mjs'
import {BufferView, DynamicBufferView} from '../src/util/BufferView.mjs'
import {assert, isBrowser, isNode} from './test-util.mjs'
import {getPath, getUrl, getFile} from './test-util.mjs'
import {promises as fs} from 'fs'



describe('parser', () => {

    it(`segments`, async () => {
        let input = await getFile('IMG_20180725_163423.jpg')
        let exifr = new Exifr(true)
        await exifr.read(input)
        exifr.findAppSegments()
        let jfifSegment = exifr.appSegments.find(segment => segment.type === 'jfif')
        assert.isDefined(jfifSegment)
        assert.equal(jfifSegment.offset, 25388)
        assert.equal(jfifSegment.length, 18)
        assert.equal(jfifSegment.start, 25397)
        assert.equal(jfifSegment.size, 9)
        assert.equal(jfifSegment.end, 25406)
    })

})
