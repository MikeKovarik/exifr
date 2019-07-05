// NOTE: this code is isomorphic and can be executed with node or ran with browser.
// It uses the new ES Modules and import syntax which might not be implemented in your
// browser or version of Node.

// To run this script in node, use 'node --experimental-modules gps.mjs'

// To run this in browser, use latest version of Chrome or Edge and make sure your
// http server serves files with .mjs extensions with the type/javascript mime.
// Also the module imports 'fs' module and it fails in browsers. For that you could
// use newly drafted importmaps.

import {parse} from '../index.mjs'

async function main() {
	var exif = await parse('../test/IMG_20180725_163423.jpg')
	console.log('latitude ', exif.latitude)
	console.log('longitude', exif.longitude)
}

main().catch(console.error)
