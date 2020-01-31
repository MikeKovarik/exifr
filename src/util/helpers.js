export const TIFF_LITTLE_ENDIAN = 0x4949
export const TIFF_BIG_ENDIAN    = 0x4D4D

export function undefinedIfEmpty(object) {
    if (isEmpty(object))
        return undefined
    else
        return object
}

export function isEmpty(object) {
    return Object.keys(object).length === 0
}

export function customError(message) {
	let err = new Error(message)
	delete err.stack
	return err
}

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
		throw new Error(`Unknown ${this.kind} '${key}'.`)
	}

	throwNotLoaded() {
		throw new Error(`${this.kind} '${key}' was not loaded, try using full build of exifr.`)
	}

	keys() {
		return Array.from(super.keys())
	}

}