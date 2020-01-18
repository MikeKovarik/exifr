const jsonTypeStart = `<<||JSON-TYPE||`
const jsonTypeEnd = `<<||JSON||>>`
const jsonStartSeparator = '>>'

function getTypeHeader(type) {
	return jsonTypeStart + type + jsonStartSeparator
}

const jsonTypes = [
	Uint8Array,
	Uint16Array,
	Uint32Array,
	Int8Array,
	Int16Array,
	Int32Array,
]

const BufferReplacer = arr => Array.from(arr).join('-')
const replacers = {
	Uint8Array:  BufferReplacer,
	Uint16Array: BufferReplacer,
	Uint32Array: BufferReplacer,
	Int8Array:   BufferReplacer,
	Int16Array:  BufferReplacer,
	Int32Array:  BufferReplacer,
}

const revivers = {
	Uint8Array:  string => new Uint8Array(string.split('-').map(str => Number(str))),
	Uint16Array: string => new Uint16Array(string.split('-').map(str => Number(str))),
	Uint32Array: string => new Uint32Array(string.split('-').map(str => Number(str))),
	Int8Array:   string => new Int8Array(string.split('-').map(str => Number(str))),
	Int16Array:  string => new Int16Array(string.split('-').map(str => Number(str))),
	Int32Array:  string => new Int32Array(string.split('-').map(str => Number(str))),
}

function cloneReplacer(key, val) {
	if (typeof val === 'object') {
		for (let Class of jsonTypes) {
			if (val instanceof Class) {
				let replacer = replacers[Class.name]
				let serialized = replacer(val)
				return getTypeHeader(Class.name) + serialized + jsonTypeEnd
			}
		}
	}
	return val
}

function cloneReviver(key, val) {
	if (typeof val === 'string' && val.startsWith(jsonTypeStart) && val.endsWith(jsonTypeEnd)) {
		let tempIndex = val.indexOf(jsonStartSeparator)
		let type = val.slice(jsonTypeStart.length, tempIndex)
		let serialized = val.slice(tempIndex + jsonStartSeparator.length, -jsonTypeEnd.length)
		let reviver = revivers[type]
		return reviver(serialized)
	}
	return val
}

export default function cloneObject(object) {
	let json = JSON.stringify(object, cloneReplacer)
	return JSON.parse(json, cloneReviver)
}