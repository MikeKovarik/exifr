import {tagKeys, createDictionary} from '../tags.mjs'


createDictionary(tagKeys, 'interop', [
	[0x0001, 'InteropIndex'],
	[0x0002, 'InteropVersion'],
	[0x1000, 'RelatedImageFileFormat'],
	[0x1001, 'RelatedImageWidth'],
	[0x1002, 'RelatedImageHeight'],
])