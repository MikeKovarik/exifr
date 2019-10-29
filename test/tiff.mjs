import {parse} from '../index.mjs'
import {assert} from './test-util.mjs'
import {getFile} from './test-util.mjs'


describe('TIFF', () => {

    it(`should contain IFD0 block (as output.image)`, async () => {
        var output = await parse(await getFile('IMG_20180725_163423.jpg'), {mergeOutput: false})
        assert.exists(output, `output is undefined`)
        assert.equal(output.image.Make, 'Google')
        assert.equal(output.image.Model, 'Pixel')
    })

    it(`should contain Exif block (as output.exif)`, async () => {
        var output = await parse(await getFile('IMG_20180725_163423.jpg'), {mergeOutput: false})
        assert.exists(output, `output is undefined`)
        assert.equal(output.exif.ExposureTime, 0.000376)
    })

    it(`should contain GPS block (as output.gps)`, async () => {
        var output = await parse(await getFile('IMG_20180725_163423.jpg'), {mergeOutput: false})
        assert.exists(output, `output is undefined`)
        assert.equal(output.gps.GPSLatitude.length, 3)
        assert.equal(output.gps.GPSLongitude.length, 3)
    })

    it(`should contain interop if requested`, async () => {
        var output = await parse(await getFile('IMG_20180725_163423.jpg'), {mergeOutput: false, interop: true})
        assert.exists(output, `output is undefined`)
        assert.equal(output.interop.InteropIndex, 'R98')
    })

    it(`should contain thumbnail (IFD1) if requested`, async () => {
        var output = await parse(await getFile('IMG_20180725_163423.jpg'), {mergeOutput: false, thumbnail: true})
        assert.exists(output, `output is undefined`)
        assert.equal(output.thumbnail.ImageHeight, 189)
    })

    it(`should contain GPS block (as output.gps) and processing method`, async () => {
        var output = await parse(await getFile('PANO_20180725_162444.jpg'), {mergeOutput: false})
        assert.exists(output, `output is undefined`)
        assert.equal(output.gps.GPSProcessingMethod, 'fused', `output doesn't contain gps`)
    })

    it(`should contain Exif block (as output.exif) if requested`, async () => {
        var output = await parse(await getFile('img_1771.jpg'))
        assert.exists(output, `output is undefined`)
        assert.equal(output.ApertureValue, 4.65625)
    })

})
