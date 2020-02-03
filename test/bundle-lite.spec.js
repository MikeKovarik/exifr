import {testBundle} from './test-util-bundles.js'
import * as exifr from '../src/bundle-lite.js'


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
		iptc: true,
	}
})