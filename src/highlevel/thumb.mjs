import * as platform from '../util/platform.mjs'
import {Buffer} from '../util/platform.mjs'
import {Exifr} from '../Exifr.mjs'
import {disableAllOptions} from './disableAllOptions.mjs'


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