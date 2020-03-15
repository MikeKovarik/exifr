import {assert} from './test-util-core.mjs'
import {getFile, getPath, isNode, isBrowser, createIframe} from './test-util-core.mjs'


describe('bundles', () => {

	if (isNode) {

	}

	if (isBrowser) {

		let bundles = ['mini', 'lite', 'full']
		for (let bundle of bundles) {

			it(bundle, async () => {
				let {exif, gps, orientation} = await createIframe(`./bundles/${bundle}.html`)
				assert.equal(exif.Model       || exif[0x0110] , 'Pixel')
				assert.equal(exif.ISO         || exif[0x8827] , 50)
				assert.equal(exif.GPSAltitude || exif[0x0006] , 252)
				assert.equal(gps.latitude, 50.29960277777778)
				assert.equal(gps.longitude, 14.820294444444444)
				assert.equal(orientation, 1)
			})

		}

	}

})