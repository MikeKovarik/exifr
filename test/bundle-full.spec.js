import {testBundle} from './test-util-bundles.js'
import * as exifr from '../src/bundle-full.js'


testBundle('full', exifr, {
	fileReaders: {
		base64: true,
		blob: true,
		fs: true,
		url: true,
	},
	fileParsers: {
		jpeg: true,
		tiff: true,
		heic: true,
	},
	segmentParsers: {
		tiff: true,
		jfif: true,
		xmp: true,
		icc: true,
		iptc: true,
	}
})