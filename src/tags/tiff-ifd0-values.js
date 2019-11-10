import {tagValues} from '../tags.js'


tagValues.tiff = tagValues.tiff || {}
let ifd0 = tagValues.tiff.ifd0 = tagValues.tiff.ifd0 || {}

// Orientation
ifd0[0x0112] = {
	1: 'Horizontal (normal)',
	2: 'Mirror horizontal',
	3: 'Rotate 180',
	4: 'Mirror vertical',
	5: 'Mirror horizontal and rotate 270 CW',
	6: 'Rotate 90 CW',
	7: 'Mirror horizontal and rotate 90 CW',
	8: 'Rotate 270 CW',
}

// ResolutionUnit
ifd0[0x0128] = {
	1: 'None',
	2: 'inches',
	3: 'cm',
}