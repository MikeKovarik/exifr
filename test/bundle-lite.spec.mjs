import {testBundle} from './test-util-bundles.mjs'
import * as exifr from '../src/bundles/lite.mjs'


testBundle('lite', exifr, {
	fileReaders: {
		base64: false,
		blob: true,
		fs: false,
		url: true,
	},
	fileParsers: {
		jpeg: true,
		tiff: false,
		heic: true,
	},
	segmentParsers: {
		tiff: true,
		jfif: false,
		xmp: true,
		icc: false,
		iptc: false,
	}
})