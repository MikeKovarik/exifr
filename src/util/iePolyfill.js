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
	// not using for-of because it would transpile to use of Symbol.iterator
	ArrayFrom(entries).forEach(([key, val]) => {
		object[key] = val
	})
	return object
})

export var ArrayFrom = Array.from || (arg => {
	if (arg instanceof Map) {
		let entries = []
		arg.forEach((val, key) => entries.push([key, val]))
		return entries
		// todo iterators (map.keys(), map.values())
	} else {
		return Array.prototype.slice.call(arg)
		//return [].slice.call(arg)
	}
})

// IE doesnt support initialization with constructor argument
export var NewSet = arr => {
	let set = new Set
	if (Array.isArray(arr)) arr.forEach(val => set.add(val))
	return set
}
export var NewMap = arr => {
	let map = new Map
	if (Array.isArray(arr))
		arr.forEach(entry => map.set(entry[0], entry[1]))
	return map
}

function includes(item) {
	return this.indexOf(item) !== -1
}

if (!Array.prototype.includes)  Array.prototype.includes  = includes
if (!String.prototype.includes) String.prototype.includes = includes
if (!String.prototype.startsWith) String.prototype.startsWith = function(search, pos = 0) {
	return this.substring(pos, pos + search.length) === search
}
if (!String.prototype.endsWith) String.prototype.endsWith = function(search, len = this.length) {
	return this.substring(len - search.length, len) === search
}

let theGlobal = typeof self !== 'undefined' ? self : global

export var TextDecoder = theGlobal.TextDecoder || class {
	decode(uintArray) {
		var encodedString = String.fromCharCode.apply(null, uintArray)
		var decodedString = decodeURIComponent(escape(encodedString))
		return decodedString
	}
}

export var fetch = theGlobal.fetch || function(url, options = {}) {
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


if (typeof 'Map' === undefined) {
	theGlobal.Map = function() {}
} else {
	if (!Map.prototype.keys) Map.prototype.keys = function() {
		let arr = []
		this.forEach((val, key) => arr.push(key))
		return arr
	}
	if (!Map.prototype.values) Map.prototype.values = function() {
		let arr = []
		this.forEach((val, key) => arr.push(val))
		return arr
	}
}
