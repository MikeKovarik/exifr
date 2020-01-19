const BUFFER_DISPLAY_LIMIT = 16

const reviverStart = '💿✨💀'
const reviverEnd   = '💾✨⚡'
const reviverStartRegex = new RegExp('"' + reviverStart, 'g')
const reviverEndRegex   = new RegExp(reviverEnd + '"', 'g')

function reviverWrap(string) {
	return reviverStart + string + reviverEnd
}

let byteTable = {
	Uint8Array:  2,
	Uint16Array: 4,
	Uint32Array: 8,
	Int8Array:   2,
	Int16Array:  4,
	Int32Array:  8,
}
Uint8Array.prototype.toJSON =
Uint16Array.prototype.toJSON =
Uint32Array.prototype.toJSON =
Int8Array.prototype.toJSON =
Int16Array.prototype.toJSON =
Int32Array.prototype.toJSON = function() {
	let name = this.constructor.name
	let valueBytes = byteTable[name]
	let size = Math.min(this.length, BUFFER_DISPLAY_LIMIT)
	let values = (new Array(size))
		.fill(0)
		.map((val, i) => this[i])
		.map(val => val.toString(16).padStart(valueBytes, '0'))
		.join(' ')
	if (size < this.length)
		return reviverWrap(`<${name} ${values} ... ${this.length - size} more>`)
	else
		return reviverWrap(`<${name} ${values}>`)
}

Array.prototype.toJSON = function() {
	return reviverWrap(`[${this.join(', ')}]`)
}

Date.prototype.toJSON = function() {
	return reviverWrap(`<Date ${this.toISOString()}>`)
}

export class JsonValueConverter {
    toView(arg, spaces = 2) {
		if (arg === undefined) return
		if (arg === null) return
		return JSON.stringify(arg, null, spaces)
			.replace(reviverStartRegex, '')
			.replace(reviverEndRegex, '')
    }
}