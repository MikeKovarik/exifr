import {tagValues, createDictionary} from '../tags.js'


let ifd0 = createDictionary(tagValues, 'ifd0', [

	// Orientation
	[0x0112, {
		1: 'Horizontal (normal)',
		2: 'Mirror horizontal',
		3: 'Rotate 180',
		4: 'Mirror vertical',
		5: 'Mirror horizontal and rotate 270 CW',
		6: 'Rotate 90 CW',
		7: 'Mirror horizontal and rotate 90 CW',
		8: 'Rotate 270 CW',
	}],

	// ResolutionUnit
	[0x0128, {
		1: 'None',
		2: 'inches',
		3: 'cm',
	}],

])

tagValues.set('thumbnail', ifd0)