import {tagValues} from '../tags.js'


let tags = tagValues.ifd0 = tagValues.thumbnail = {}

// Orientation
tags[0x0112] = {
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
tags[0x0128] = {
	1: 'None',
	2: 'inches',
	3: 'cm',
}