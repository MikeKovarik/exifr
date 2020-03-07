export var ObjectKeys = Object.keys || (object => {
	let keys = []
	for (let key in object) keys.push(key)
	return keys
})

export var ObjectValues = Object.values || (object => {
	let values = []
	for (let key in object) values.push(object[key])
	return values
})

export var ObjectEntries = Object.entries || (object => {
	let entries = []
	for (let key in object) entries.push([key, object[key]])
	return entries
})

export var ObjectAssign = Object.assign || ((target, ...objects) => {
	objects.forEach(object => {
		for (let key in object)
			target[key] = object[key]
	})
	return target
})

export var ObjectFromEntries = Object.fromEntries || (entries => {
	let object = {}
	// no using for of because it would transpile to use of Symbol.iterator
	ArrayFrom(entries).forEach(([key, val]) => {
		object[key] = val
	})
	return object
})

export var ArrayFrom = Array.from || (arg => {
	if (arg instanceof Map) {
		let entries = []
		arg.forEach(key => entries.push(key, arg[key]))
		return entries
		// todo iterators (map.keys(), map.values())
	} else {
		return Array.prototype.slice.call(arg)
		//return [].slice.call(arg)
	}
})

function includes(item) {
	return this.indexOf(item) !== -1
}

if (!Array.prototype.includes)  Array.prototype.includes  = includes
if (!String.prototype.includes) String.prototype.includes = includes

export class TextDecoder {
	decode(uintArray) {
		var encodedString = String.fromCharCode.apply(null, uintArray)
		var decodedString = decodeURIComponent(escape(encodedString))
		return decodedString
	}
}

export function fetch(url, options = {}) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest()
		xhr.open('get', url, true)
		xhr.responseType = 'arraybuffer'
		xhr.onerror = reject
		if (options.headers)
			for (const key in options.headers)
				xhr.setRequestHeader(key, options.headers[key])
		xhr.onload = () => {
			resolve({
				ok: xhr.status >= 200 && xhr.status < 300,
				status: xhr.status,
				arrayBuffer: () => Promise.resolve(xhr.response),
			})
		}
		xhr.send(null)
	})
}