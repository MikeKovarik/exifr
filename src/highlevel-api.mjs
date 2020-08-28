// High level API.
import * as platform from './util/platform.mjs'
import {Buffer} from './util/platform.mjs'
import {Exifr} from './Exifr.mjs'
import {TAG_GPS_LATREF, TAG_GPS_LAT, TAG_GPS_LONREF, TAG_GPS_LON, TAG_ORIENTATION} from './tags.mjs'


export const disableAllOptions = {
	ifd0: false,
	ifd1: false,
	exif: false,
	gps: false,
	interop: false,
	// turning off all unnecessary steps and transformation to get the needed data ASAP
	sanitize: false,
	reviveValues: true,
	translateKeys: false,
	translateValues: false,
	mergeOutput: false,
}

export const gpsOnlyOptions = Object.assign({}, disableAllOptions, {
	firstChunkSize: 40000,
	gps: [TAG_GPS_LATREF, TAG_GPS_LAT, TAG_GPS_LONREF, TAG_GPS_LON],
})

export const orientationOnlyOptions = Object.assign({}, disableAllOptions, {
	firstChunkSize: 40000,
	ifd0: [TAG_ORIENTATION],
})

export const thumbnailOnlyOptions = Object.assign({}, disableAllOptions, {
	tiff: false,
	ifd1: true,
	// needed to prevent options from disabling ifd1
	mergeOutput: false
})


export async function thumbnail(input) {
	let exr = new Exifr(thumbnailOnlyOptions)
	await exr.read(input)
	let u8arr = await exr.extractThumbnail()
	if (u8arr && platform.hasBuffer)
		return Buffer.from(u8arr)
	else
		return u8arr
}

// only available in browser
export async function thumbnailUrl(input) {
	let u8arr = await this.thumbnail(input)
	if (u8arr !== undefined) {
		let blob = new Blob([u8arr]) // note: dont use AB directly, because of byteOffset
		return URL.createObjectURL(blob)
	}
}

export async function gps(input) {
	let exr = new Exifr(gpsOnlyOptions)
	await exr.read(input)
	let output = await exr.parse()
	if (output && output.gps) {
		let {latitude, longitude} = output.gps
		return {latitude, longitude}
	}
}

export async function orientation(input) {
	let exr = new Exifr(orientationOnlyOptions)
	await exr.read(input)
	let output = await exr.parse()
	if (output && output.ifd0) {
		return output.ifd0[TAG_ORIENTATION]
	}
}

export const rotations = {
	1: {dimensionSwapped: false, scaleX:  1, scaleY:  1, deg:   0, rad:   0                },
	2: {dimensionSwapped: false, scaleX: -1, scaleY:  1, deg:   0, rad:   0                },
	3: {dimensionSwapped: false, scaleX:  1, scaleY:  1, deg: 180, rad: 180 * Math.PI / 180},
	4: {dimensionSwapped: false, scaleX: -1, scaleY:  1, deg: 180, rad: 180 * Math.PI / 180},
	5: {dimensionSwapped: true,  scaleX:  1, scaleY: -1, deg:  90, rad:  90 * Math.PI / 180},
	6: {dimensionSwapped: true,  scaleX:  1, scaleY:  1, deg:  90, rad:  90 * Math.PI / 180},
	7: {dimensionSwapped: true,  scaleX:  1, scaleY: -1, deg: 270, rad: 270 * Math.PI / 180},
	8: {dimensionSwapped: true,  scaleX:  1, scaleY:  1, deg: 270, rad: 270 * Math.PI / 180}
}

export var rotateCanvas = true
export var rotateCss = true

if (typeof navigator === 'object') {
	let ua = navigator.userAgent
	if (ua.includes('iPad') || ua.includes('iPhone')) {
		let [match, major, minor] = ua.match(/OS (\d+)_(\d+)/)
		let version = Number(major) + Number(minor) * 0.1
		// before ios 13.4, orientation is needed for canvas
		// since ios 13.4, the data passed to canvas is already rotated
		rotateCanvas = version < 13.4
		rotateCss = false
	}
	if (ua.includes('Chrome/')) {
		let [match, version] = ua.match(/Chrome\/(\d+)/)
		if (Number(version) >= 81)
			rotateCanvas = rotateCss = false
	} else if (ua.includes('Firefox/')) {
		let [match, version] = ua.match(/Firefox\/(\d+)/)
    if (Number(version) >= 77)
      rotateCanvas = rotateCss = false
	}
}

export async function rotation(input) {
	let or = await orientation(input)
	return Object.assign({
		canvas: rotateCanvas,
		css: rotateCss,
	}, rotations[or])
}
