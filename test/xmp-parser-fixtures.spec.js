import {assert, getFile} from './test-util-core.js'
import XmpParser from '../src/segment-parsers/xmp.js'
import {BufferView} from '../src/util/BufferView.js'


const GROUP_OPTIONS = {mergeOutput: false}

describe('XmpParser - real world cases', () => {

    async function getString(name) {
        let arrayBuffer = await getFile(name)
        let bufferView = new BufferView(arrayBuffer)
        return bufferView.getString()
    }

    describe('xmp-MunchSP1919.xml', async () => {

        it('merged', async () => {
            let code = await getString('xmp-MunchSP1919.xml')
            let output = XmpParser.parse(code)
            assert.equal(output.Lens, '17.0-85.0 mm')
            assert.equal(output.ImageWidth, 3195)
            assert.equal(output.Model, 'Canon EOS 20D')
            assert.equal(output.CreatorContactInfo.CiAdrRegion, 'California')
            assert.isArray(output.SubjectCode)
            assert.lengthOf(output.SubjectCode, 5)
            assert.equal(output.SubjectCode[4], 'Self-portraits')
            assert.deepEqual(output.ToneCurve, ['0, 0', '32, 22', '64, 56', '128, 128', '192, 196', '255, 255'])
            assert.equal(output.ToneCurveName, 'Medium Contrast')
            assert.equal(output.Version, 4.2)
        })

        it('grouped', async () => {
            let code = await getString('xmp-MunchSP1919.xml')
            let output = XmpParser.parse(code, GROUP_OPTIONS)
            let namespaces = ['Iptc4xmpCore', 'MicrosoftPhoto', 'aux', 'crs', 'dc', 'exif', 'mediapro', 'photoshop', 'tiff', 'xmp', 'xmpMM']
            assert.containsAllKeys(output, namespaces)
            assert.deepEqual(output.aux, {
                Firmware: '2.0.2',
                FlashCompensation: '0/1',
                ImageNumber: 0,
                Lens: '17.0-85.0 mm',
                LensInfo: '17/1 85/1 0/0 0/0',
                OwnerName: 'UCSD AAL',
                SerialNumber: 1320910591,
            })
            assert.deepEqual(output.xmpMM, {
                DocumentID: 'uuid:42328C558489DC11B5C7E17965EE46D2',
                InstanceID: 'uuid:C85209F08489DC11B5C7E17965EE46D2',
            })
            assert.deepEqual(output.mediapro, {
                People: ['Munch', 'Edvard (1863-1944)']
            })
            // picking and matching just some properties out of large objects with much more properties
            assert.equal(output.tiff.ImageLength, 2122)
            assert.equal(output.tiff.ImageWidth, 3195)
            assert.equal(output.tiff.Make, 'Canon')
            assert.equal(output.tiff.Model, 'Canon EOS 20D')
            // Iptc4xmpCore namespace
            assert.isObject(output.Iptc4xmpCore.CreatorContactInfo)
            assert.equal(output.Iptc4xmpCore.CreatorContactInfo.CiAdrPcode, '92093-0175')
            assert.equal(output.Iptc4xmpCore.CreatorContactInfo.CiAdrRegion, 'California')
            assert.isArray(output.Iptc4xmpCore.SubjectCode)
            assert.lengthOf(output.Iptc4xmpCore.SubjectCode, 5)
            assert.equal(output.Iptc4xmpCore.SubjectCode[4], 'Self-portraits')
            // crs namespace
            assert.equal(output.crs.ColorNoiseReduction, 25)
            assert.equal(output.crs.HasCrop, false)
            assert.equal(output.crs.HasSettings, true)
            assert.equal(output.crs.HueAdjustmentAqua, 0)
            assert.equal(output.crs.Tint, '+3')
            assert.deepEqual(output.crs.ToneCurve, ['0, 0', '32, 22', '64, 56', '128, 128', '192, 196', '255, 255'])
            assert.equal(output.crs.ToneCurveName, 'Medium Contrast')
            assert.equal(output.crs.Version, 4.2)
        })

    })

    describe('gpano: xmp + xmp extended', async () => {

        describe('xmp-gpano-main.xml', async () => {

            it('merged', async () => {
                let code = await getString('xmp-gpano-main.xml')
                let output = XmpParser.parse(code)
                assert.deepEqual(output, {
                    GPano: 'http://ns.google.com/photos/1.0/panorama/',
                    GImage: 'http://ns.google.com/photos/1.0/image/',
                    GAudio: 'http://ns.google.com/photos/1.0/audio/',
                    xmpNote: 'http://ns.adobe.com/xmp/note/',
                    CroppedAreaLeftPixels: 0,
                    CroppedAreaTopPixels: 1932,
                    CroppedAreaImageWidthPixels: 9344,
                    CroppedAreaImageHeightPixels: 1613,
                    FullPanoWidthPixels: 9344,
                    FullPanoHeightPixels: 4672,
                    InitialViewHeadingDegrees: 180,
                    Mime: 'audio/mp4a-latm',
                    HasExtendedXMP: '5740B4AB4292ABB7BDCE0639415FA33F',
                })
            })

            it('grouped', async () => {
                let code = await getString('xmp-gpano-main.xml')
                let output = XmpParser.parse(code, GROUP_OPTIONS)
                assert.deepEqual(output.xmlns, {
                    GPano: 'http://ns.google.com/photos/1.0/panorama/',
                    GImage: 'http://ns.google.com/photos/1.0/image/',
                    GAudio: 'http://ns.google.com/photos/1.0/audio/',
                    xmpNote: 'http://ns.adobe.com/xmp/note/',
                })
                assert.deepEqual(output.GPano, {
                    CroppedAreaLeftPixels: 0,
                    CroppedAreaTopPixels: 1932,
                    CroppedAreaImageWidthPixels: 9344,
                    CroppedAreaImageHeightPixels: 1613,
                    FullPanoWidthPixels: 9344,
                    FullPanoHeightPixels: 4672,
                    InitialViewHeadingDegrees: 180,
                })
                assert.deepEqual(output.GImage, {
                    Mime: 'image/jpeg',
                })
                assert.deepEqual(output.GAudio, {
                    Mime: 'audio/mp4a-latm',
                })
                assert.deepEqual(output.xmpNote, {
                    HasExtendedXMP: '5740B4AB4292ABB7BDCE0639415FA33F',
                })
            })

        })

        describe('xmp-gpano-ext.xml', async () => {

            it('merged', async () => {
                let code = await getString('xmp-gpano-ext.xml')
                let output = XmpParser.parse(code)
                assert.equal(output.GImage, 'http://ns.google.com/photos/1.0/image/')
                assert.equal(output.GAudio, 'http://ns.google.com/photos/1.0/audio/')
                assert.isString(output.Data)
                assert.isString(output.Data.slice(0, 8), 'AAAAGGZ0')
                assert.isString(output.Data.slice(-8),   'AQAAACA=')
            })

            it('grouped', async () => {
                let code = await getString('xmp-gpano-ext.xml')
                let output = XmpParser.parse(code, GROUP_OPTIONS)
                assert.isObject(output.xmlns)
                assert.equal(output.GImage.Data.slice(0, 8), '/9j/4AAQ')
                assert.equal(output.GImage.Data.slice(-8),   'C6iMzP/Z')
                assert.equal(output.GAudio.Data.slice(0, 8), 'AAAAGGZ0')
                assert.equal(output.GAudio.Data.slice(-8),   'AQAAACA=')
            })

        })

        describe('synthetically combined', async () => {

            it('merged', async () => {
                let code = await getString('xmp-gpano-main.xml') + await getString('xmp-gpano-ext.xml')
                let output = XmpParser.parse(code)
                assert.equal(output.GImage, 'http://ns.google.com/photos/1.0/image/')
                assert.equal(output.GAudio, 'http://ns.google.com/photos/1.0/audio/')
                assert.equal(output.CroppedAreaImageHeightPixels, 1613)
                assert.equal(output.InitialViewHeadingDegrees, 180)
                assert.equal(output.HasExtendedXMP, '5740B4AB4292ABB7BDCE0639415FA33F')
                assert.equal(output.Mime, 'audio/mp4a-latm')
                assert.isString(output.Data.slice(0, 8), 'AAAAGGZ0')
                assert.isString(output.Data.slice(-8),   'AQAAACA=')
            })

            it('grouped', async () => {
                let code = await getString('xmp-gpano-main.xml') + await getString('xmp-gpano-ext.xml')
                let output = XmpParser.parse(code, GROUP_OPTIONS)
                assert.deepEqual(output.xmlns, {
                    GPano: 'http://ns.google.com/photos/1.0/panorama/',
                    GImage: 'http://ns.google.com/photos/1.0/image/',
                    GAudio: 'http://ns.google.com/photos/1.0/audio/',
                    xmpNote: 'http://ns.adobe.com/xmp/note/',
                })
                assert.deepEqual(output.xmpNote, {
                    HasExtendedXMP: '5740B4AB4292ABB7BDCE0639415FA33F',
                })
                assert.equal(output.GImage.Mime, 'image/jpeg')
                assert.isString(output.GImage.Data.slice(0, 8), '/9j/4AAQ')
                assert.isString(output.GImage.Data.slice(-8),   'C6iMzP/Z')
                assert.equal(output.GAudio.Mime, 'audio/mp4a-latm')
                assert.isString(output.GAudio.Data.slice(0, 8), 'AAAAGGZ0')
                assert.isString(output.GAudio.Data.slice(-8),   'AQAAACA=')
            })

        })

    })

    describe('xmp1.xml', async () => {

        it('merged', async () => {
            let code = await getString('xmp1.xml')
            let output = XmpParser.parse(code)
            assert.equal(output.about, 'DJI Meta Data')
            assert.equal(output.AbsoluteAltitude, -8.074252)
            assert.equal(output.GimbalYawDegree, -115.300003)
            assert.equal(output.FlightPitchDegree, 6)
            assert.equal(output.CentralTemperature, 1)
            assert.equal(output.TlinearGain, 0.04)
            assert.equal(output.BandName, 'LWIR')
            assert.equal(output.CentralWavelength, 10000)
            assert.equal(output.WavelengthFWHM, 4500)
        })

        it('grouped', async () => {
            let code = await getString('xmp1.xml')
            let output = XmpParser.parse(code, GROUP_OPTIONS)
            assert.equal(output.rdf.about, 'DJI Meta Data')
            assert.equal(output['drone-dji'].AbsoluteAltitude, -8.074252)
            assert.equal(output['drone-dji'].GimbalYawDegree, -115.300003)
            assert.equal(output['drone-dji'].FlightPitchDegree, 6)
            assert.equal(output.FLIR.CentralTemperature, 1)
            assert.equal(output.FLIR.TlinearGain, 0.04)
            assert.equal(output.FLIR.BandName, 'LWIR')
            assert.equal(output.FLIR.CentralWavelength, 10000)
            assert.equal(output.FLIR.WavelengthFWHM, 4500)
        })

    })

    describe('xmp2.xml', async () => {

        it('merged', async () => {
            let code = await getString('xmp2.xml')
            let output = XmpParser.parse(code)
            assert.equal(output.CreateDate, '1970-01-01')
            assert.equal(output.Model, 'Test_Pro')
            assert.equal(output.format, 'image/jpg')
            assert.equal(output.GimbalYawDegree, '-127.10')
            assert.equal(output.GimbalPitchDegree, '+1.00')
            assert.equal(output.FlightRollDegree, '+0.00')
            assert.equal(output.Version, 7)
            assert.equal(output.HasSettings, false)
        })

        it('grouped', async () => {
            let code = await getString('xmp2.xml')
            let output = XmpParser.parse(code, GROUP_OPTIONS)
            // defined and used namespaces
            assert.isObject(output.tiff)
            assert.isObject(output.xmp)
            assert.isObject(output.crs)
            assert.isObject(output['drone-dji'])
            // defined but unused namespaces
            assert.equal(output.exif)
            assert.equal(output.GPano)
            assert.equal(output.xmpMM)
            // dc is object of only one property
            assert.isObject(output.dc)
            assert.hasAllKeys(output.dc, ['format'])
            assert.equal(output.dc.format, 'image/jpg')
            // attrs and values
            assert.equal(output.xmp.CreateDate, '1970-01-01')
            assert.equal(output.tiff.Model, 'Test_Pro')
            assert.equal(output['drone-dji'].GimbalYawDegree, '-127.10')
            assert.equal(output['drone-dji'].GimbalPitchDegree, '+1.00')
            assert.equal(output['drone-dji'].FlightRollDegree, '+0.00')
            assert.equal(output.crs.Version, 7)
            assert.equal(output.crs.HasSettings, false)
        })

    })

    describe('cookiezen.xmp', async () => {

        it('merged', async () => {
            let code = await getString('cookiezen.xmp')
            let output = XmpParser.parse(code)
            assert.deepEqual(output, {
                xmpMM: 'http://ns.adobe.com/xap/1.0/mm/',
                stRef: 'http://ns.adobe.com/xap/1.0/sType/ResourceRef#',
                xmp: 'http://ns.adobe.com/xap/1.0/',
                CreatorTool: 'Adobe Photoshop CC 2015 (Windows)',
                OriginalDocumentID: 'xmp.did:d5ce43c4-6c37-6e48-b4c7-34ee041e7e1a',
                DocumentID: 'xmp.did:C39D1BD9C4A111E6AA23E41B54801FB7',
                InstanceID: 'xmp.iid:C39D1BD8C4A111E6AA23E41B54801FB7',
                DerivedFrom: {
                    instanceID: 'xmp.iid:fded51f7-dab6-a945-b486-0deb8273465e',
                    documentID: 'xmp.did:d5ce43c4-6c37-6e48-b4c7-34ee041e7e1a'
                }
            })
        })

        it('grouped', async () => {
            let code = await getString('cookiezen.xmp')
            let output = XmpParser.parse(code, GROUP_OPTIONS)
            // namespace definitions
            assert.deepEqual(output.xmlns, {
                xmpMM: 'http://ns.adobe.com/xap/1.0/mm/',
                stRef: 'http://ns.adobe.com/xap/1.0/sType/ResourceRef#',
                xmp: 'http://ns.adobe.com/xap/1.0/',
            })
            // the data
            assert.equal(output.xmp.CreatorTool, 'Adobe Photoshop CC 2015 (Windows)')
            assert.deepEqual(output.xmpMM, {
                OriginalDocumentID: 'xmp.did:d5ce43c4-6c37-6e48-b4c7-34ee041e7e1a',
                DocumentID: 'xmp.did:C39D1BD9C4A111E6AA23E41B54801FB7',
                InstanceID: 'xmp.iid:C39D1BD8C4A111E6AA23E41B54801FB7',
                DerivedFrom: {
                    instanceID: 'xmp.iid:fded51f7-dab6-a945-b486-0deb8273465e',
                    documentID: 'xmp.did:d5ce43c4-6c37-6e48-b4c7-34ee041e7e1a'
                }
            })
        })

    })

    describe('xmp4.xml', async () => {

        it('merged', async () => {
            let code = await getString('xmp4.xml')
            let output = XmpParser.parse(code)
            assert.equal(output.CreateDate, '2017-05-06T15:24:07.63')
            assert.equal(output.ApproximateFocusDistance, '168/100')
            assert.equal(output.Sharpness, 25)
            assert.equal(output.SaturationAdjustmentBlue, 0)
            assert.equal(output.creator, 'FRPASSAQUAY')
            assert.equal(output.History[1].changed, '/')
            assert.deepEqual(output.ToneCurvePV2012Blue, ['0, 0', '255, 255'])
        })

        it('grouped', async () => {
            let code = await getString('xmp4.xml')
            let output = XmpParser.parse(code, GROUP_OPTIONS)
            assert.equal(output.xmp.CreateDate, '2017-05-06T15:24:07.63')
            assert.equal(output.aux.ApproximateFocusDistance, '168/100')
            assert.equal(output.crs.Sharpness, 25)
            assert.equal(output.crs.SaturationAdjustmentBlue, 0)
            assert.equal(output.dc.creator, 'FRPASSAQUAY')
            assert.equal(output.xmpMM.History[1].changed, '/')
            assert.deepEqual(output.crs.ToneCurvePV2012Blue, ['0, 0', '255, 255'])
        })

    })

    describe('xmp-random.xml', async () => {

        it('merged', async () => {
            let code = await getString('xmp-random.xml')
            let output = XmpParser.parse(code)
            assert.deepEqual(output.title, {
                lang: 'x-default',
                value: 'XMP Specification Part 3: Storage in Files',
            })
            assert.equal(output.creator, 'Adobe Developer Technologies')
        })

        it('grouped', async () => {
            let code = await getString('xmp-random.xml')
            let output = XmpParser.parse(code, GROUP_OPTIONS)
            assert.deepEqual(output.dc.title, {
                lang: 'x-default',
                value: 'XMP Specification Part 3: Storage in Files',
            })
            assert.equal(output.dc.creator, 'Adobe Developer Technologies')
        })

    })

})