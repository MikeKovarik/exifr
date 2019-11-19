// Exposed object of tag dictionaries that either user specifies or exifr loads into.
export const tagKeys = {}
export const tagValues = {}
export const tagRevivers = {}
export const tags = tagKeys // todo deprecate


export function findTag(tag) {
	for (let [key, name] of Object.entries(tags))
		if (tag === name) return Number(key)
}

export const TAG_MAKERNOTE   = 0x927C
export const TAG_USERCOMMENT = 0x9286
export const TAG_APPNOTES    = 0x02BC

export const TAG_IFD_EXIF      = 0x8769
export const TAG_IFD_GPS       = 0x8825
export const TAG_IFD_INTEROP   = 0xA005
