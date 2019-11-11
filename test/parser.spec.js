import {assert} from './test-util.js'
import {isBrowser, isNode, getPath, getUrl, getFile} from './test-util.js'
import {parse, Exifr} from '../src/index-full.js'



describe('parser', () => {

    it(`.findJpgAppSegments() finds jpeg APP segments in jpg file`, async () => {
        let input = await getFile('IMG_20180725_163423.jpg')
        let exifr = new Exifr()
        await exifr.read(input)
        exifr.findJpgAppSegments()
        exifr.options = {tiff: true, xmp: true, jfif: true}
        let jfifSegment = exifr.appSegments.find(segment => segment.type === 'jfif')
        assert.isDefined(jfifSegment)
        assert.equal(jfifSegment.offset, 25388)
        assert.equal(jfifSegment.length, 18)
        assert.equal(jfifSegment.start, 25397)
        assert.equal(jfifSegment.size, 9)
        assert.equal(jfifSegment.end, 25406)
		/*
        let tiffSegment = exifr.appSegments.find(segment => segment.type === 'tiff')
        assert.isDefined(tiffSegment)
        let xmpSegment = exifr.appSegments.find(segment => segment.type === 'xmp')
        assert.isDefined(xmpSegment)
		*/
    })

	// TODO: tests for tif

})
