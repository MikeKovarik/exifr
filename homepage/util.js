Promise.timeout = millis => new Promise(resolve => setTimeout(resolve, millis))

export class BinaryValueConverter {
    toView(arg, showAll) {
		if (notDefined(arg)) return
		let arr = Array.from(arg)
		let [values, remaining] = clipContent(arr, showAll, 60)
		let output = formatBytes(values)
		if (remaining > 0) output += `\n... and ${remaining} more`
		return output
    }
}

export class CharLimitValueConverter {
    toView(string, showAll) {
		if (notDefined(string)) return
		let arr = string.split('')
		let [values, remaining] = clipContent(arr, showAll, 300)
		let output = values.join('')
		if (remaining > 0) output += `\n... and ${remaining} more`
		return output
    }
}

function clipContent(arr, showAll, limit) {
	if (showAll) {
		var values = arr
		var remaining = 0
	} else {
		var [values, remaining] = sliceArray(arr, limit)
	}
	return [values, remaining]
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
