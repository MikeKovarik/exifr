// Exposed object of tag dictionaries that either user specifies or exifr loads into.
export const tagKeys = {}
export const tagValues = {}
export const tags = tagKeys // todo deprecate
export const valueString = tagValues // todo deprecate

export function findTag(tagName) {
	for (let [code, name] of Object.entries(tags))
		if (tagName === name) return Number(code)
}

export const TAG_MAKERNOTE   = 0x927C
export const TAG_USERCOMMENT = 0x9286
export const TAG_APPNOTES    = 0x02BC

export const TAG_IFD_EXIF      = 0x8769
export const TAG_IFD_GPS       = 0x8825
export const TAG_IFD_INTEROP   = 0xA005

export const dates = [
	0x9003,
	0x9004,
	0x0132,
]

