import {tagRevivers} from '../tags.js'
import {toAsciiString} from '../util/BufferView.js'


tagRevivers.ifd0 =
tagRevivers.thumbnail = {
	0xC68B: toAsciiString,
	0x0132: reviveDate,
}

tagRevivers.exif = {
	0xA000: toAsciiString,
	0x9000: toAsciiString,
	0x9003: reviveDate,
	0x9004: reviveDate,
}

tagRevivers.gps = {
	0x0000: val => Array.from(val).join('.'), // GPSVersionID
	0x0007: val => Array.from(val).join(':'), // GPSTimeStamp
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
