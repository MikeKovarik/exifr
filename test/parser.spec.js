import {assert} from './test-util.js'
import {isBrowser, isNode, getPath, getUrl, getFile} from './test-util.js'
import {parse, Exifr} from '../src/index-full.js'



describe('parser', () => {

    it(`segments`, async () => {
        let input = await getFile('IMG_20180725_163423.jpg')
        let exifr = new Exifr(true)
        await exifr.read(input)
        exifr.findJpgAppSegments()
        let jfifSegment = exifr.appSegments.find(segment => segment.type === 'jfif')
        assert.isDefined(jfifSegment)
        assert.equal(jfifSegment.offset, 25388)
        assert.equal(jfifSegment.length, 18)
        assert.equal(jfifSegment.start, 25397)
        assert.equal(jfifSegment.size, 9)
        assert.equal(jfifSegment.end, 25406)
    })

})
