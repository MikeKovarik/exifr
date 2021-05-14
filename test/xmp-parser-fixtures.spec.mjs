import {assert, getFile} from './test-util-core.mjs'
// FIXME: importing directly from src/ breaks bundle tests
import Xmp from '../src/segment-parsers/xmp.mjs'
import {BufferView} from '../src/util/BufferView.mjs'


describe('Xmp - real world cases', () => {

    async function getString(name) {
        let arrayBuffer = await getFile(name)
        let bufferView = new BufferView(arrayBuffer)
        return bufferView.getString()
    }

    it('xmp-MunchSP1919.xml', async () => {

		let code = await getString('xmp-MunchSP1919.xml')
		let output = Xmp.parse(code)
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

    describe('gpano: xmp + xmp extended', async () => {

        it('xmp-gpano-main.xml', async () => {
			let code = await getString('xmp-gpano-main.xml')
			let output = Xmp.parse(code)
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

        it('xmp-gpano-ext.xml', async () => {
			let code = await getString('xmp-gpano-ext.xml')
			let output = Xmp.parse(code)
			assert.isObject(output.xmlns)
			assert.equal(output.GImage.Data.slice(0, 8), '/9j/4AAQ')
			assert.equal(output.GImage.Data.slice(-8),   'C6iMzP/Z')
			assert.equal(output.GAudio.Data.slice(0, 8), 'AAAAGGZ0')
			assert.equal(output.GAudio.Data.slice(-8),   'AQAAACA=')
        })

        it('synthetically combined', async () => {
			let code = await getString('xmp-gpano-main.xml') + await getString('xmp-gpano-ext.xml')
			let output = Xmp.parse(code)
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

    it('xmp1.xml', async () => {
		let code = await getString('xmp1.xml')
		let output = Xmp.parse(code)
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

    it('xmp2.xml', async () => {
		let code = await getString('xmp2.xml')
		let output = Xmp.parse(code)
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

    it('cookiezen.xmp', async () => {
		let code = await getString('cookiezen.xmp')
		let output = Xmp.parse(code)
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

    it('xmp4.xml', async () => {
		let code = await getString('xmp4.xml')
		let output = Xmp.parse(code)
		assert.equal(output.xmp.CreateDate, '2017-05-06T15:24:07.63')
		assert.equal(output.aux.ApproximateFocusDistance, '168/100')
		assert.equal(output.crs.Sharpness, 25)
		assert.equal(output.crs.SaturationAdjustmentBlue, 0)
		assert.equal(output.dc.creator, 'FRPASSAQUAY')
		assert.equal(output.xmpMM.History[1].changed, '/')
		assert.deepEqual(output.crs.ToneCurvePV2012Blue, ['0, 0', '255, 255'])
    })

    it('xmp-random.xml', async () => {
		let code = await getString('xmp-random.xml')
		let output = Xmp.parse(code)
		assert.deepEqual(output.dc.title, {
			lang: 'x-default',
			value: 'XMP Specification Part 3: Storage in Files',
		})
		assert.equal(output.dc.creator, 'Adobe Developer Technologies')
    })


// WARNING: UNFINISHED, INCOMPLETE, INCORRECT
    it('xmp-gcam-portrait.xml', async () => {
		let code = await getString('xmp-gcam-portrait.xml')
		let output = Xmp.parse(code)
		// main xmp
		assert.equal(output.GCamera.BurstID, '3e972be5-3033-4f33-a532-fe90384f280a')
		assert.equal(output.GCamera.BurstPrimary, 1)
		// extended xmp
		assert.equal(output.Device.Container.parseType, 'Resource')
		assert.lengthOf(output.Device.Container.Directory, 4)
		assert.equal(output.Device.Container.Directory[1].Mime, 'image/jpeg')
		assert.equal(output.Device.Container.Directory[3].Length, 96395)
		assert.equal(output.Device.Profiles.Type, 'DepthPhoto')
		assert.equal(output.Device.Profiles.CameraIndices, 0)
		// array with single item becomes the sole object of the property
		assert.isObject(output.Device.Cameras)
		assert.equal(output.Device.Cameras.Image.ItemURI, 'android/original_image')
		assert.equal(output.Device.Cameras.DepthMap.Near, 0.3)
		assert.equal(output.Device.Cameras.DepthMap.FocalTable, 'mpmZPgAAAAAAAABBAABAQQ')
		assert.equal(output.Device.Cameras.ImagingModel.ImageWidth, 3264)
		assert.equal(output.Device.Cameras.ImagingModel.PrincipalPointY, 1232.100342)
    })


})