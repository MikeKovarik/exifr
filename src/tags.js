class Dictionary extends Map {

	get tagKeys() {
		if (!this.allKeys)
			this.allKeys = Array.from(this.keys())
		return this.allKeys
	}

	get tagValues() {
		if (!this.allValues)
			this.allValues = Array.from(this.values())
		return this.allValues
	}

}

export function createDictionary(group, key, entries) {
	//let dict = new Dictionary(entries)
	let dict = new Dictionary()
	// ie doesnt support constructor initialization
	for (let [key, val] of entries)
		dict.set(key, val)
	if (Array.isArray(key))
		for (let k of key) group.set(k, dict)
	else
		group.set(key, dict)
	return dict
}

export function extendDictionary(group, blockName, newTags) {
	let map = group.get(blockName)
	let entry
	for (entry of newTags) map.set(entry[0], entry[1])
}

export const tagKeys     = new Map
export const tagValues   = new Map
export const tagRevivers = new Map

export const TAG_MAKERNOTE   = 0x927C
export const TAG_USERCOMMENT = 0x9286
export const TAG_XMP         = 0x02BC
export const TAG_IPTC        = 0x83bb
export const TAG_PHOTOSHOP   = 0x8649
export const TAG_ICC         = 0x8773

export const TAG_IFD_EXIF      = 0x8769
export const TAG_IFD_GPS       = 0x8825
export const TAG_IFD_INTEROP   = 0xA005

export const TAG_GPS_LATREF = 0x0001
export const TAG_GPS_LAT    = 0x0002
export const TAG_GPS_LONREF = 0x0003
export const TAG_GPS_LON    = 0x0004

export const TAG_ORIENTATION = 0x0112
