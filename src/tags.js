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
