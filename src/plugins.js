import {customError} from './util/helpers.js'


export class PluginList extends Map {

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

	get keyList() {
		return Array.from(this.keys())
	}

}


export var fileParsers    = new PluginList('file parser')
export var segmentParsers = new PluginList('segment parser')
export var fileReaders    = new PluginList('file reader')