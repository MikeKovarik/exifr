import global from './global.mjs'


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

// IE doesnt support initialization with constructor argument
export var NewSet = arr => {
	let set = []
	Object.defineProperties(set, {
		size: {
			get() {
				return this.length
			}
		},
		has: {
			value(item) {
				return this.indexOf(item) !== -1
			}
		},
		add: {
			value(item) {
				if (!this.has(item)) this.push(item)
			}
		},
		delete: {
			value(item) {
				if (this.has(item)) {
					let index = this.indexOf(item)
					this.splice(index, 1)
				}
			}
		},
	})
	if (Array.isArray(arr))
		for (let i = 0; i < arr.length; i++)
			set.add(arr[i])
	return set
}

export var NewMap = arr => {
	return new Map(arr)
}

var hasFullyImplementedMap = typeof global.Map !== 'undefined' && global.Map.prototype.keys !== undefined
export var Map = hasFullyImplementedMap ? global.Map : class Map {

	constructor(init) {
		this.clear()
		if (init)
			for (var i = 0; i < init.length; i++)
				this.set(init[i][0], init[i][1])
	}

	clear() {
		this._map = {}
		this._keys = []
	}

	get size() {
		return this._keys.length
	}

	get(key) {
		return this._map["map_"+key];
	}

	set(key, value) {
		this._map["map_"+key]=value;
		if(this._keys.indexOf(key)<0)this._keys.push(key);
		return this;
	}

	has(key) {
		return this._keys.indexOf(key)>=0;
	}

	delete(key) {
		var idx=this._keys.indexOf(key)
		if (idx < 0) return false
		delete this._map["map_" + key]
		this._keys.splice(idx, 1)
		return true
	}

	keys() {
		return this._keys.slice(0)
	}

	values() {
		return this._keys.map(key => this.get(key))
	}

	entries() {
		return this._keys.map(key => [key, this.get(key)])
	}

	forEach(callback, thisArg) {
		for (var i = 0; i < this._keys.length; i++)
		callback.call(thisArg, this._map["map_" + this._keys[i]], this._keys[i], this);
	}

}
