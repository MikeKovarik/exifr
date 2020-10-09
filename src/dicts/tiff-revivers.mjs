import {tagRevivers, createDictionary} from '../tags.mjs'
import {toAsciiString} from '../util/BufferView.mjs'
import {normalizeString} from '../util/helpers.mjs'


createDictionary(tagRevivers, ['ifd0', 'ifd1'], [
	[0xC68B, toAsciiString],
	[0x0132, reviveDate],

	// extensions
	[0x9c9b, reviveUcs2String],
	[0x9c9c, reviveUcs2String],
	[0x9c9d, reviveUcs2String],
	[0x9c9e, reviveUcs2String],
	[0x9c9f, reviveUcs2String],
])

createDictionary(tagRevivers, 'exif', [
	[0xA000, reviveVersion],
	[0x9000, reviveVersion],
	[0x9003, reviveDate],
	[0x9004, reviveDate],
	// https://github.com/MikeKovarik/exifr/issues/36
	[0xa002, unwrapExifSizeArray],
	[0xa003, unwrapExifSizeArray],
])

createDictionary(tagRevivers, 'gps', [
	[0x0000, val => Array.from(val).join('.')], // GPSVersionID
	[0x0007, val => Array.from(val).join(':')], // GPSTimeStamp
])

function unwrapExifSizeArray(arr) {
	if (typeof arr === 'object' && arr.length !== undefined)
		return arr[0]
	else
		return arr
}

function reviveVersion(bytes) {
	let array = Array.from(bytes).slice(1)
	if (array[1] > 0x0f)
		array = array.map(code => String.fromCharCode(code))
	if (array[2] === '0' || array[2] === 0) array.pop()
	return array.join('.')
}

// can be '2009-09-23 17:40:52 UTC' or '2010:07:06 20:45:12'
function reviveDate(string) {
	if (typeof string !== 'string') return undefined
	var [year, month, day, hours, minutes, seconds] = string.trim().split(/[-: ]/g).map(Number)
	var date = new Date(year, month - 1, day)
	if (!Number.isNaN(hours) && !Number.isNaN(minutes) && !Number.isNaN(seconds)) {
		date.setHours(hours)
		date.setMinutes(minutes)
		date.setSeconds(seconds)
	}
	if (Number.isNaN(+date))
		return string
	else
		return date
}

function reviveUcs2String(arg) {
	if (typeof arg === 'string') return arg
	let codePoints = []
	let le = arg[1] === 0 && arg[arg.length - 1] === 0 // little endian
	if (le) {
		for (let i = 0; i < arg.length; i += 2)
			codePoints.push(mergeBytes(arg[i + 1], arg[i]))
	} else {
		for (let i = 0; i < arg.length; i += 2)
			codePoints.push(mergeBytes(arg[i], arg[i + 1]))
	}
	return normalizeString(String.fromCodePoint(...codePoints))
}

function mergeBytes(byte1, byte2) {
    return (byte1 << 8) | byte2
}