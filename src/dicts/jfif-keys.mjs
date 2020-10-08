import {tagKeys, createDictionary} from '../tags.mjs'



// JPEG Header Tags
// the number is not a tag code but an offset in buffer (standard jpg header)
// so there's no missing 1,2,3,5,6,7, etc... tag
createDictionary(tagKeys, 'jfif', [
	[0, 'JFIFVersion'],
	[2, 'ResolutionUnit'],
	[3, 'XResolution'],
	[5, 'YResolution'],
	[7, 'ThumbnailWidth'],
	[8, 'ThumbnailHeight']
])