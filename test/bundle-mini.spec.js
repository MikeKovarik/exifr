import {testBundle} from './test-util-bundles.js'
import * as exifr from '../src/bundle-mini.js'


testBundle('mini', exifr, {
	fileReaders: {
		base64: false,
		blob: true,
		fs: false,
		url: false,
	},
	fileParsers: {
		jpeg: true,
		tiff: false,
		heic: false,
	},
	segmentParsers: {
		tiff: true,
		jfif: false,
		xmp: false,
		icc: false,
		iptc: false,
	}
})