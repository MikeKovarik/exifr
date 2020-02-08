import {customError} from './util/helpers.js'


export function throwUnknown(kind, key) {
	throw customError(`Unknown ${kind} '${key}'.`)
}

export function throwNotLoaded(kind, key) {
	throw customError(`${kind} '${key}' was not loaded, try using full build of exifr.`)
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

export function fixIeSubclassing(target, Class, methods = [], getters = []) {
	// Hack to get IE11 to work. IE11 has builtin Map but it doesn't support subclassing.
	// PluginList doesn't change behavior of .get(), we just add checks that throw if key was not found.
	// IE wont throw these errors but will work. I'm ok with this regression.
	// We just need to copy additional custom method.
	for (let key of methods)
		if (target[key] === undefined) target[key] = Class.prototype[key]
	for (let key of getters) {
		let targetDesc = Object.getOwnPropertyDescriptor(target, key)
		if (targetDesc === undefined) {
			let protoDesc = Object.getOwnPropertyDescriptor(Class.prototype, key)
			Object.defineProperty(target, key, protoDesc)
		}
	}
}

export var fileParsers    = new PluginList('file parser')
export var segmentParsers = new PluginList('segment parser')
export var fileReaders    = new PluginList('file reader')

fixIeSubclassing(fileParsers,    PluginList, ['keyList'])
fixIeSubclassing(segmentParsers, PluginList, ['keyList'])
fixIeSubclassing(fileReaders,    PluginList, ['keyList'])