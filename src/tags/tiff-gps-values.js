import {tagValues} from '../tags.js'


let tags = tagValues.gps = {}

// TODO https://exiftool.org/TagNames/GPS.html

// GPSDestBearingRef
tags[0x0017] = {
	M: 'Magnetic North',
	T: 'True North',
}

// GPSDestDistanceRef
tags[0x0019] = {
	K: 'Kilometers',
	M: 'Miles',
	N: 'Nautical Miles',
}
