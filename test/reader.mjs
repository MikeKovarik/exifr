import {parse} from '../index.mjs'
import {assert, isBrowser, isNode} from './test-util.mjs'
import {createImg, createArrayBuffer, createBlob, getPath, getUrl, createWorker, createObjectUrl, createBase64Url, getFile} from './test-util.mjs'
import {promises as fs} from 'fs'


describe('reader (input formats)', () => {

	isNode && it(`Node: Buffer`, async () => {
		var buffer = await fs.readFile(getPath('IMG_20180725_163423.jpg'))
		var output = await parse(buffer)
		assert.exists(output, `output is undefined`)
	})

	isBrowser && it(`Browser: ArrayBuffer`, async () => {
		var arrayBuffer = await createArrayBuffer(getPath('IMG_20180725_163423.jpg'))
		var output = await parse(arrayBuffer)
		assert.exists(output, `output is undefined`)
	})

	isBrowser && it(`Browser: Blob`, async () => {
		var blob = await createBlob(getPath('IMG_20180725_163423.jpg'))
		var output = await parse(blob)
		assert.exists(output, `output is undefined`)
	})

	isNode && it(`Node: string file path`, async () => {
		let path = getPath('IMG_20180725_163423.jpg')
		var output = await parse(path)
		assert.exists(output, `output is undefined`)
	})

	isBrowser && it(`Browser: string URL`, async () => {
		let url = getUrl('IMG_20180725_163423.jpg')
		var output = await parse(url)
		assert.exists(output, `output is undefined`)
	})

	isBrowser && it(`Browser: Object URL`, async () => {
		var blob = await createObjectUrl(getPath('IMG_20180725_163423.jpg'))
		var output = await parse(blob)
		assert.exists(output, `output is undefined`)
	})

	it(`Browser & Node: base64 URL`, async () => {
		var blob = await createBase64Url(getPath('IMG_20180725_163423.jpg'))
		var output = await parse(blob)
		assert.exists(output, `output is undefined`)
	})

	isBrowser && it(`Browser: <img> element with normal URL`, async () => {
		var img = createImg(getPath('IMG_20180725_163423.jpg'))
		var output = await parse(img)
		assert.exists(output, `output is undefined`)
	})

	isBrowser && it(`Browser: <img> element with Object URL`, async () => {
		var img = createImg(await createObjectUrl(getPath('IMG_20180725_163423.jpg')))
		var output = await parse(img)
		assert.exists(output, `output is undefined`)
	})

	isBrowser && it(`WebWorker: string URL`, async () => {
		let url = getUrl('IMG_20180725_163423.jpg')
		let output = await createWorker(url)
		assert.isObject(output, `output is undefined`)
	})

	isBrowser && it(`WebWorker: ArrayBuffer`, async () => {
		let arrayBuffer = await createArrayBuffer(getPath('IMG_20180725_163423.jpg'))
		let output = await createWorker(arrayBuffer)
		assert.isObject(output, `output is undefined`)
	})

	//isBrowser && it(`<img> element with base64 URL`, async () => {
	//	var img = createImg(await createBase64Url(getPath('IMG_20180725_163423.jpg')))
	//	await parse(img)
	//})



	// file with short exif where all segments are together at the
	// start of the file, within single chunk

	it(`simple file, read/fetch whole file - should succeed`, async () => {
		let options = {wholeFile: true}
		var output = await parse(getPath('IMG_20180725_163423.jpg'), options)
		console.log('output', output)
		assert.equal(output.Make, 'Google')
	})

	it(`simple file, chunked mode, allow additional chunks - should succeed`, async () => {
		let options = {wholeFile: undefined}
		var output = await parse(getPath('IMG_20180725_163423.jpg'), options)
		assert.equal(output.Make, 'Google')
	})

	it(`simple file, chunked mode, no additional chunks - should succeed`, async () => {
		let options = {wholeFile: false}
		var output = await parse(getPath('IMG_20180725_163423.jpg'), options)
		assert.equal(output.Make, 'Google')
	})

	// Exif is scattered throughout the file.
	// Header at the beginning of file, data at the end.
	// tiff offset at 0; ID0 offset at 677442

	it(`scattered file, read/fetch whole file - should succeed`, async () => {
		let options = {wholeFile: true}
		var output = await parse(getPath('001.tif'), options)
		assert.equal(output.Make, 'DJI')
	})

/*
TODO: rewrite chunked reader for 3.0.0
	it(`scattered file, chunked mode, allow additional chunks - should succeed`, async () => {
		let options = {wholeFile: undefined}
		var output = await parse(getPath('001.tif'), options)
		assert.equal(output.Make, 'DJI')
	})

	it(`scattered file, chunked mode, no additional chunks - should fail`, async () => {
		let options = {wholeFile: false}
		var output = await parse(getPath('001.tif'), options)
		assert.equal(exif, undefined)
	})
*/

})
