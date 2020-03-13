import * as umd from '../../dist/full.umd.js'
import * as esm from '../../dist/full.esm.js'

let filePath = '../fixtures/img_1771.jpg'

;(async function() {
	let arrayBuffer = await fetch(filePath).then(res => res.arrayBuffer())
	let umdResult = await umd.parse(arrayBuffer)
	let esmResult = await esm.parse(arrayBuffer)
	if (window.testResult) window.testResult({umdResult, esmResult})
})()
