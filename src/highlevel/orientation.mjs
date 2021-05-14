import {Exifr} from '../Exifr.mjs'
import {TAG_ORIENTATION} from '../tags.mjs'
import {disableAllOptions} from './disableAllOptions.mjs'


export const orientationOnlyOptions = Object.assign({}, disableAllOptions, {
	firstChunkSize: 40000,
	ifd0: [TAG_ORIENTATION],
})

export async function orientation(input) {
	let exr = new Exifr(orientationOnlyOptions)
	await exr.read(input)
	let output = await exr.parse()
	if (output && output.ifd0) {
		return output.ifd0[TAG_ORIENTATION]
	}
}

export const rotations = Object.freeze({
	1: {dimensionSwapped: false, scaleX:  1, scaleY:  1, deg:   0, rad:   0                },
	2: {dimensionSwapped: false, scaleX: -1, scaleY:  1, deg:   0, rad:   0                },
	3: {dimensionSwapped: false, scaleX:  1, scaleY:  1, deg: 180, rad: 180 * Math.PI / 180},
	4: {dimensionSwapped: false, scaleX: -1, scaleY:  1, deg: 180, rad: 180 * Math.PI / 180},
	5: {dimensionSwapped: true,  scaleX:  1, scaleY: -1, deg:  90, rad:  90 * Math.PI / 180},
	6: {dimensionSwapped: true,  scaleX:  1, scaleY:  1, deg:  90, rad:  90 * Math.PI / 180},
	7: {dimensionSwapped: true,  scaleX:  1, scaleY: -1, deg: 270, rad: 270 * Math.PI / 180},
	8: {dimensionSwapped: true,  scaleX:  1, scaleY:  1, deg: 270, rad: 270 * Math.PI / 180}
})

export let rotateCanvas = true
export let rotateCss = true

if (typeof navigator === 'object') {
	let ua = navigator.userAgent
	if (ua.includes('iPad') || ua.includes('iPhone')) {
		// doesn't always match in webview: https://github.com/MikeKovarik/exifr/pull/42
		let matchArray = ua.match(/OS (\d+)_(\d+)/)
		if (matchArray) {
			let [, major, minor] = matchArray
			let version = Number(major) + Number(minor) * 0.1
			// before ios 13.4, orientation is needed for canvas
			// since ios 13.4, the data passed to canvas is already rotated
			rotateCanvas = version < 13.4
			rotateCss = false
		}
	} else if (ua.includes('OS X 10')) {
		let [, version] = ua.match(/OS X 10[_.](\d+)/)
		rotateCanvas = rotateCss = Number(version) < 15
	}
	if (ua.includes('Chrome/')) {
		let [, version] = ua.match(/Chrome\/(\d+)/)
		rotateCanvas = rotateCss = Number(version) < 81
	} else if (ua.includes('Firefox/')) {
		let [, version] = ua.match(/Firefox\/(\d+)/)
		rotateCanvas = rotateCss = Number(version) < 77
	}
}

export async function rotation(input) {
	let or = await orientation(input)
	return Object.assign({
		canvas: rotateCanvas,
		css: rotateCss,
	}, rotations[or])
}
