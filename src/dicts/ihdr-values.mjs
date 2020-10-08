import {tagValues, createDictionary} from '../tags.mjs'


// PNG Header Tags
createDictionary(tagValues, 'ihdr', [

    [9, {
        0: 'Grayscale',
        2: 'RGB',
        3: 'Palette',
        4: 'Grayscale with Alpha',
        6: 'RGB with Alpha',
		DEFAULT: 'Unknown',
    }],

    [10, {
        0: 'Deflate/Inflate',
		DEFAULT: 'Unknown',
	}],

    [11, {
        0: 'Adaptive',
		DEFAULT: 'Unknown',
	}],

    [12, {
        0: 'Noninterlaced',
        1: 'Adam7 Interlace',
		DEFAULT: 'Unknown',
	}],

])