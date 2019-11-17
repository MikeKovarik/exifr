import {tagRevivers} from '../tags.js'
import {valueString} from '../tags.js'


tagRevivers.ifd0 =
tagRevivers.exif =
tagRevivers.interop =
tagRevivers.thumbnail = {
	0x9003: reviveDate,
	0x9004: reviveDate,
	0x0132: reviveDate,
	//0xA301: val => Array.from(val).map(v => valueString.SceneType[v]).join(', '),
	//0x9101: val => Array.from(val).map(v => valueString.Components[v]).join(', '),
	0xA000: toString,
	0x9000: toString,
	//if (valueString[key] !== undefined)
	//	return valueString[key][val] || val
}

tagRevivers.gps = {
	0x0000: val => Array.from(val).join('.'), // GPSVersionID
	0x0007: val => Array.from(val).join(':'), // GPSTimeStamp
}

// Converts date string to Date instances, replaces enums with string descriptions
// and fixes values that are incorrectly treated as buffers.
export function translateValue(key, val) {
	if (val === undefined || val === null)
		return undefined
	//if (dates.includes(key))
	//	return reviveDate(val)
	if (key === 'SceneType')
		return Array.from(val).map(v => valueString.SceneType[v]).join(', ')
	if (key === 'ComponentsConfiguration')
		return Array.from(val).map(v => valueString.Components[v]).join(', ')
	if (valueString[key] !== undefined)
		return valueString[key][val] || val
	if (key === 'FlashpixVersion' || key === 'ExifVersion')
		return toString(val)
	if (key === 'GPSVersionID')
		return Array.from(val).join('.')
	if (key === 'GPSTimeStamp')
		return Array.from(val).join(':')
	return val
}

export function reviveDate(string) {
	if (typeof string !== 'string') return null
	string = string.trim()
	var [dateString, timeString] = string.split(' ')
	var [year, month, day] = dateString.split(':').map(Number)
	var date = new Date(year, month - 1, day)
	if (timeString) {
		var [hours, minutes, seconds] = timeString.split(':').map(Number)
		date.setHours(hours)
		date.setMinutes(minutes)
		date.setSeconds(seconds)
	}
	return date
}

export function ConvertDMSToDD(degrees, minutes, seconds, direction) {
	var dd = degrees + (minutes / 60) + (seconds / (60*60))
	// Don't do anything for N or E
	if (direction == 'S' || direction == 'W')
		dd *= -1
	return dd
}
