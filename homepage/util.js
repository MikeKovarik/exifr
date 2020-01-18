Promise.timeout = millis => new Promise(resolve => setTimeout(resolve, millis))

export class BinaryValueConverter {
    toView(arg) {
		if (arg === undefined) return
		if (arg === null) return
		return Array.from(arg)
			.map(num => num.toString(16).padStart(2, '0'))
			.join(' ')
    }
}


// ISO => ISO
// XMPToolkit => XMP Toolkit
// FNumber => F Number
// AbsoluteAltitude => Absolute Altitude
// FlightRollDegree => Flight Roll Degree
// imageWidth => Image Width
// latitude => Latitude
export function splitTag(string) {
	return string.match(matchRegex).map(capitalize).join(' ')
}

export function capitalize(string) {
	return string.charAt(0).toUpperCase() + string.slice(1)
}

var matchRegex = /([A-Z]+(?=[A-Z][a-z]))|([A-Z][a-z]+)|([0-9]+)|([a-z]+)|([A-Z]+)/g
