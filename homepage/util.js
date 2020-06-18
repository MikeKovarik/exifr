Promise.timeout = millis => new Promise(resolve => setTimeout(resolve, millis))

const MAX_CHARS_IN_TABLE = 60

export class TableValueValueConverter {
    toView(arg) {
		if (notDefined(arg)) return
		if (arg instanceof Uint8Array)
			return clipBytes(arg, 8)
		else if (typeof arg === 'string')
			return clipString(arg, MAX_CHARS_IN_TABLE)
		else
			return arg
    }
}

export class ByteLimitValueConverter {
    toView(uint8arr, showAll) {
		if (notDefined(uint8arr)) return
		if (!(uint8arr instanceof Uint8Array)) return
		if (showAll) return uint8arr
		return clipBytes(uint8arr, 60)
    }
}

export class CharLimitValueConverter {
    toView(string, showAll) {
		if (notDefined(string)) return
		if (typeof string !== 'string') return
		if (showAll) return string
		return clipString(string, 300)
    }
}

export function clipBytes(uint8arr, limit) {
	let arr = Array.from(uint8arr)
	let [values, remaining] = sliceArray(arr, limit)
	let output = formatBytes(values)
	if (remaining > 0) output += `\n... and ${remaining} more`
	return output
}

export function clipString(string, limit) {
	let arr = string.split('')
	let [values, remaining] = sliceArray(arr, limit)
	let output = values.join('')
	if (remaining > 0) output += `\n... and ${remaining} more`
	return output
}

function sliceArray(arr, limit) {
	let size = Math.min(arr.length, limit)
	let values = arr.slice(0, size)
	if (size < arr.length)
		return [values, arr.length - size]
	else
		return [values, 0]
}

function formatBytes(arr) {
	return arr
		.map(val => val.toString(16).padStart(2, '0'))
		.join(' ')
}

// ISO => ISO
// XMPToolkit => XMP Toolkit
// FNumber => F Number
// AbsoluteAltitude => Absolute Altitude
// FlightRollDegree => Flight Roll Degree
// imageWidth => Image Width
// latitude => Latitude
export function prettyCase(string) {
	return string.match(matchRegex).map(capitalize).join(' ')
}

export function capitalize(string) {
	return string.charAt(0).toUpperCase() + string.slice(1)
}

export class PrettyCaseValueConverter {
    toView(string) {
		if (notDefined(string)) return
		return prettyCase(string)
    }
}

function notDefined(arg) {
	return arg === undefined
		|| arg === null
}

var matchRegex = /([A-Z]+(?=[A-Z][a-z]))|([A-Z][a-z]+)|([0-9]+)|([a-z]+)|([A-Z]+)/g
