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

function typedArrayToJson() {
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

function arrayToJson() {
	return reviverWrap(`[${this.join(', ')}]`)
}

function dateToJson() {
	return reviverWrap(`<Date ${this.toISOString()}>`)
}

let originalToJson = new Map([
	[Uint8Array,  Uint8Array.prototype.toJSON],
	[Uint16Array, Uint16Array.prototype.toJSON],
	[Uint32Array, Uint32Array.prototype.toJSON],
	[Int8Array,   Int8Array.prototype.toJSON],
	[Int16Array,  Int16Array.prototype.toJSON],
	[Int32Array,  Int32Array.prototype.toJSON],
	[Array,       Array.prototype.toJSON],
	[Date,        Date.prototype.toJSON],
])

let customToJson = new Map([
	[Uint8Array,  typedArrayToJson],
	[Uint16Array, typedArrayToJson],
	[Uint32Array, typedArrayToJson],
	[Int8Array,   typedArrayToJson],
	[Int16Array,  typedArrayToJson],
	[Int32Array,  typedArrayToJson],
	[Array,       arrayToJson],
	[Date,        dateToJson],
])

function applyToJsonMethods(map) {
	for (let [Class, fn] of map)
		Class.prototype.toJSON = fn
}

export class JsonValueConverter {
    toView(arg, spaces = 2) {
		if (arg === undefined) return
		if (arg === null) return
		applyToJsonMethods(customToJson)
		let json = JSON.stringify(arg, null, spaces)
			.replace(reviverStartRegex, '')
			.replace(reviverEndRegex, '')
		applyToJsonMethods(originalToJson)
		return json
    }
}