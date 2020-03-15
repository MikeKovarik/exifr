import {assert, getPath, getFile} from './test-util-core.mjs'


export function testBundle(bundleName, exifr, bundleOptions) {

	describe(bundleName, () => {

		describe('file readers', () => {
			// fileReaders, fileParsers, segmentParsers

			let loadedReaders = Array.from(exifr.fileReaders.keys())

			it(`Base64Reader should not be included`, async () => {
				if (bundleOptions.fileReaders.base64)
					assert.include(loadedReaders, 'base64')
				else
					assert.notInclude(loadedReaders, 'base64')
			})

			it(`BlobReader should not be included`, async () => {
				if (bundleOptions.fileReaders.blob)
					assert.include(loadedReaders, 'blob')
				else
					assert.notInclude(loadedReaders, 'blob')
			})

			it(`FsReader should not be included`, async () => {
				if (bundleOptions.fileReaders.fs)
					assert.include(loadedReaders, 'fs')
				else
					assert.notInclude(loadedReaders, 'fs')
			})

			it(`UrlFetcher should not be included`, async () => {
				if (bundleOptions.fileReaders.url)
					assert.include(loadedReaders, 'url')
				else
					assert.notInclude(loadedReaders, 'url')
			})

		})

		describe('file parsers', () => {

			it(`JPEG ${bundleOptions.fileParsers.jpeg ? 'should' : 'should not'} be included`, async () => {
				let file = await getFile('IMG_20180725_163423-tiny.jpg')
				let output = await exifr.parse(file, {tiff: true}).catch(err => err)
				if (bundleOptions.fileParsers.jpeg) {
					assert.notInstanceOf(output, Error)
				} else {
					assert.instanceOf(output, Error)
					assert.include(output.message, 'jpeg')
					assert.include(output.message, 'not loaded')
				}
			})

			it(`TIFF ${bundleOptions.fileParsers.tiff ? 'should' : 'should not'} be included`, async () => {
				let file = await getFile('001.tif')
				let output = await exifr.parse(file, {tiff: true}).catch(err => err)
				if (bundleOptions.fileParsers.tiff) {
					assert.notInstanceOf(output, Error)
				} else {
					assert.instanceOf(output, Error)
					assert.include(output.message, 'tiff')
					assert.include(output.message, 'not loaded')
				}
			})

			it(`HEIC ${bundleOptions.fileParsers.heic ? 'should' : 'should not'} be included`, async () => {
				let file = await getFile('heic-iphone7.heic')
				let output = await exifr.parse(file, {tiff: true}).catch(err => err)
				if (bundleOptions.fileParsers.heic) {
					assert.notInstanceOf(output, Error)
				} else {
					assert.instanceOf(output, Error)
					assert.include(output.message, 'heic')
					assert.include(output.message, 'not loaded')
				}
			})

		})

		describe('segment parsers', () => {

			let file
			before(async () => file = await getFile('BonTonARTSTORplusIPTC.jpg'))

			let baseOptions = Object.fromEntries(Object.entries(bundleOptions.segmentParsers).map(entry => [entry[0], false]))

			for (let [key, enabled] of Object.entries(bundleOptions.segmentParsers)) {

				let outputKey = key === 'tiff' ? 'ifd0' : key
				let enabled = bundleOptions.segmentParsers[key]

				it(`${key.toUpperCase()} ${enabled ? 'should' : 'should not'} be included`, async () => {
					let parseOptions = Object.assign({}, baseOptions, {[key]: true, mergeOutput: false})
					let output = await exifr.parse(file, parseOptions).catch(err => err)
					if (key === 'xmp') {
						if (enabled) {
							assert.equal(output.photoshop.ColorMode, 3)
							assert.equal(output.art.Culture, 'French')
						} else {
							assert.isUndefined(output.photoshop)
							assert.isUndefined(output.art)
						}
					} else {
						if (enabled)
							assert.isDefined(output[outputKey])
						else
							assert.instanceOf(output, Error)
					}
				})

			}

		})

		describe('segment parsers', () => {

			it('extracts basic TIFF info', async () => {
				let file = await getFile('IMG_20180725_163423-tiny.jpg')
				let output = await exifr.parse(file)
				assert.equal(output.Model       || output[0x0110] , 'Pixel')
				assert.equal(output.ISO         || output[0x8827] , 50)
				assert.equal(output.GPSAltitude || output[0x0006] , 252)
			})

			it('.orientation()', async () => {
				let file = await getFile('IMG_20180725_163423-tiny.jpg')
				assert.equal(await exifr.orientation(file), 1)
			})

		})

	})

}