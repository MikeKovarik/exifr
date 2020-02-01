import {customError} from './util/helpers.js'


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


function createPluginList(kind) {
	let map = new PluginList(kind)
	// Hack to get IE11 to work. IE11 has builtin Map but it doesn't support subclassing.
	// PluginList doesn't change behavior of .get(), we just add checks that throw if key was not found.
	// IE wont throw these errors but will work. I'm ok with this regression.
	// We just need to copy additional custom method.
	if (map.keyList === undefined) map.keyList = PluginList.prototype.keyList
	return map
}

export var fileParsers    = createPluginList('file parser')
export var segmentParsers = createPluginList('segment parser')
export var fileReaders    = createPluginList('file reader')