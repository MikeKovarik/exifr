let allKeys

// Exposed object of tag dictionaries that either user specifies or exifr loads into.
class TagKeys {

	get all() {
		if (allKeys) return allKeys
		allKeys = {}
		for (let [key, dict] of Object.entries(tagKeys)) {
			if (key === 'all') continue
			Object.assign(allKeys, dict)
		}
		return allKeys
	}

	// TODO: move findTag from options here
	//find(tag) {}

}

export const tagKeys = new TagKeys
export const tagValues = {}
export const tagRevivers = {}

export const TAG_MAKERNOTE   = 0x927C
export const TAG_USERCOMMENT = 0x9286
export const TAG_APPNOTES    = 0x02BC // XMP

export const TAG_IFD_EXIF      = 0x8769
export const TAG_IFD_GPS       = 0x8825
export const TAG_IFD_INTEROP   = 0xA005
