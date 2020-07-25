import {throwError} from './util/helpers.mjs'


export function throwUnknown(kind, key) {
	throwError(`Unknown ${kind} '${key}'.`)
}

export function throwNotLoaded(kind, key) {
	throwError(`${kind} '${key}' was not loaded, try using full build of exifr.`)
}

class PluginList extends Map {

	constructor(kind) {
		super()
		this.kind = kind
	}

	// INVESTIGATE: move this check from runtime to options constructor
	get(key, options) {
		if (!this.has(key))
			throwNotLoaded(this.kind, key)
		if (options) {
			if (!(key in options))
				throwUnknown(this.kind, key)
			if (!options[key].enabled)
				throwNotLoaded(this.kind, key)
		}
		return super.get(key)
	}

	keyList() {
		return Array.from(this.keys())
	}

}

export var fileParsers    = new PluginList('file parser')
export var segmentParsers = new PluginList('segment parser')
export var fileReaders    = new PluginList('file reader')