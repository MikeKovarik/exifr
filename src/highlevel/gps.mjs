import {Exifr} from '../Exifr.mjs'
import {TAG_GPS_LATREF, TAG_GPS_LAT, TAG_GPS_LONREF, TAG_GPS_LON} from '../tags.mjs'
import {disableAllOptions} from './disableAllOptions.mjs'


export const gpsOnlyOptions = Object.assign({}, disableAllOptions, {
	firstChunkSize: 40000,
	gps: [TAG_GPS_LATREF, TAG_GPS_LAT, TAG_GPS_LONREF, TAG_GPS_LON],
})

export async function gps(input) {
	let exr = new Exifr(gpsOnlyOptions)
    
	try {
	    await exr.read(input)
	    let output = await exr.parse()
	    
	    if (output && output.gps) {
	        let {latitude, longitude} = output.gps
	        return {latitude, longitude}
	    }
	} finally {
        // The Auto-Close Fix for gps: Runs after success or failure
	    if (exr.file && exr.file.close) {
	        await exr.file.close()
	    }
	}
}
