import * as exifr from '../index.mjs'

self.onmessage = async e => {
	console.log('worker received task from main', e.data)
	var output = await exifr.parse(e.data)
	console.log('worker parsed output', output)
	postMessage(output)
}
