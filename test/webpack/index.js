import * as fullUmd from '../../dist/full.umd.js'
import * as fullEsm from '../../dist/full.esm.js'
import * as miniUmd from '../../dist/mini.umd.js'
import * as miniEsm from '../../dist/mini.esm.js'

let filePath = '../fixtures/img_1771.jpg'

const Model = 0x0110

fetch(filePath).then(res => res.arrayBuffer()).then(arrayBuffer => {
	fullUmd.parse(arrayBuffer).then(exif => console.log('full UMD:', exif.Model))
	fullEsm.parse(arrayBuffer).then(exif => console.log('full ESM:', exif.Model))
	miniUmd.parse(arrayBuffer).then(exif => console.log('mini UMD:', exif[Model]))
	miniEsm.parse(arrayBuffer).then(exif => console.log('mini ESM:', exif[Model]))
})