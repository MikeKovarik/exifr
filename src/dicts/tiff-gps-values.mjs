import {tagValues, createDictionary} from '../tags.mjs'


// TODO https://exiftool.org/TagNames/GPS.html

createDictionary(tagValues, 'gps', [

	// GPSDestBearingRef
	[0x0017, {
		M: 'Magnetic North',
		T: 'True North',
	}],

	// GPSDestDistanceRef
	[0x0019, {
		K: 'Kilometers',
		M: 'Miles',
		N: 'Nautical Miles',
	}],

])