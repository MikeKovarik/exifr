import {customError} from './util/helpers.js'

/*
class PluginList extends Map {

	constructor(kind) {
		super()
		this.kind = kind
	}

	get(key, options) {
		if (!this.has(key))
			this.throwNotLoaded()
		if (options) {
			if (!(key in options))
				this.throwUnknown()
			if (!options[key].enabled)
				this.throwNotLoaded()
		}
		return super.get(key)
	}

	throwUnknown() {
		throw customError(`Unknown ${this.kind} '${key}'.`)
	}

	throwNotLoaded() {
		throw customError(`${this.kind} '${key}' was not loaded, try using full build of exifr.`)
	}

	keyList() {
		return Array.from(this.keys())
	}

}
*/

// This hack is ugly as hell and I would've wanted to use a class instead
// But IE doesn't support subclassing from native types.

Map.prototype._get = Map.prototype.get
function createPluginList(kind) {
	let map = new Map
	map.kind = kind
	map.get = function(key, options) {
		if (!this.has(key))
			this.throwNotLoaded()
		if (options) {
			if (!(key in options))
				this.throwUnknown()
			if (!options[key].enabled)
				this.throwNotLoaded()
		}
		return this._get(key)
	}

	map.throwUnknown = function() {
		throw customError(`Unknown ${this.kind} '${key}'.`)
	}

	map.throwNotLoaded = function() {
		throw customError(`${this.kind} '${key}' was not loaded, try using full build of exifr.`)
	}

	map.keyList = function() {
		return Array.from(this.keys())
	}
	return map
}

export var fileParsers    = createPluginList('file parser')
export var segmentParsers = createPluginList('segment parser')
export var fileReaders    = createPluginList('file reader')