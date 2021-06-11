import {promises as fs} from 'fs'
import {assert} from './test-util-core.mjs'
import {isBrowser, isNode, getPath, getFile} from './test-util-core.mjs'
import * as exifr from '../src/bundles/full.mjs'


export function createImg(url) {
	var img = document.createElement('img')
	img.src = url
	document.querySelector('#temp').append(img)
	return img
}

export async function createArrayBuffer(urlOrPath) {
	let bufferOrAb = await getFile(urlOrPath)
	if (bufferOrAb instanceof Uint8Array)
		return bufferOrAb.buffer
	else
		return bufferOrAb
}

export function createBlob(fileName) {
	return fetch(getPath(fileName)).then(res => res.blob())
}

export async function createObjectUrl(fileName) {
	return URL.createObjectURL(await createBlob(fileName))
}

export async function createBase64Url(fileName) {
	let url = getPath(fileName)
	if (isBrowser) {
		return new Promise(async (resolve, reject) => {
			var blob = await createBlob(url)
			var reader = new FileReader()
			reader.onloadend = () => resolve(reader.result)
			reader.onerror = reject
			reader.readAsDataURL(blob) 
		})
	} else if (isNode) {
		var buffer = await fs.readFile(url)
		return 'data:image/jpeg;base64,' + buffer.toString('base64')
	}
}

export function createWorker(input) {
	return new Promise((resolve, reject) => {
		let worker = new Worker('worker.mjs', { type: "module" })
		worker.postMessage(input)
		worker.onmessage = e => resolve(e.data)
		worker.onerror = err => reject('WebWorker onerror')
	})
}

describe('reader', () => {

	describe('input formats', () => {

		it(`ArrayBuffer`, async () => {
			var arrayBuffer = await createArrayBuffer('IMG_20180725_163423.jpg')
			var output = await exifr.parse(arrayBuffer)
			assert.isObject(output, `output is undefined`)
		})

		it(`DataView`, async () => {
			var arrayBuffer = await createArrayBuffer('IMG_20180725_163423.jpg')
			let dataView = new DataView(arrayBuffer)
			var output = await exifr.parse(dataView)
			assert.isObject(output, `output is undefined`)
		})

		it(`Uint8Array`, async () => {
			var arrayBuffer = await createArrayBuffer('IMG_20180725_163423.jpg')
			let uint8Array = new Uint8Array(arrayBuffer)
			var output = await exifr.parse(uint8Array)
			assert.isObject(output, `output is undefined`)
		})

		it(`ExternalReader`, async() => {
			let called;

			const externalReader = async (input, offset, length) => {
				called = {input, offset, length};
				let buffer = await getFile(input);
				return buffer.slice(offset, length);
			}
						
			var output = await exifr.parse('IMG_20180725_163423.jpg', {externalReader})
			assert.isObject(output, `output is undefined`)
			assert.isObject(called)
		})

		isNode && it(`Node: Buffer`, async () => {
			var buffer = await fs.readFile(getPath('IMG_20180725_163423.jpg'))
			var output = await exifr.parse(buffer)
			assert.isObject(output, `output is undefined`)
		})

		isBrowser && it(`Browser: Blob`, async () => {
			var blob = await createBlob('IMG_20180725_163423.jpg')
			var output = await exifr.parse(blob)
			assert.isObject(output, `output is undefined`)
		})

		isNode && it(`Node: string file path`, async () => {
			let path = getPath('IMG_20180725_163423.jpg')
			var output = await exifr.parse(path)
			assert.isObject(output, `output is undefined`)
		})

		isBrowser && it(`Browser: string URL`, async () => {
			let url = getPath('IMG_20180725_163423.jpg')
			var output = await exifr.parse(url)
			assert.isObject(output, `output is undefined`)
		})

		isBrowser && it(`Browser: Object URL`, async () => {
			var blob = await createObjectUrl('IMG_20180725_163423.jpg')
			var output = await exifr.parse(blob)
			assert.isObject(output, `output is undefined`)
		})

		it(`Browser & Node: base64 URL`, async () => {
			var blob = await createBase64Url('IMG_20180725_163423.jpg')
			var output = await exifr.parse(blob)
			assert.isObject(output, `output is undefined`)
		})

		isBrowser && it(`Browser: <img> element with normal URL`, async () => {
			var img = createImg(getPath('IMG_20180725_163423.jpg'))
			var output = await exifr.parse(img)
			assert.isObject(output, `output is undefined`)
		})

		isBrowser && it(`Browser: <img> element with Object URL`, async () => {
			var img = createImg(await createObjectUrl('IMG_20180725_163423.jpg'))
			var output = await exifr.parse(img)
			assert.isObject(output, `output is undefined`)
		})

		describe('Browser: WebWoker', () => {

			isBrowser && it(`string URL`, async () => {
				let url = getPath('IMG_20180725_163423.jpg')
				let output = await createWorker(url)
				assert.isObject(output, `output is undefined`)
			})

			isBrowser && it(`ArrayBuffer`, async () => {
				let arrayBuffer = await createArrayBuffer('IMG_20180725_163423.jpg')
				let output = await createWorker(arrayBuffer)
				assert.isObject(output, `output is undefined`)
			})

		})

	})

})
