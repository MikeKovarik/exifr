import chai from 'chai'
import path from 'path'
import {promises as fs} from 'fs'


export var isBrowser = typeof navigator === 'object'
export var isNode = typeof process === 'object' && process.versions && process.versions.node

if (isBrowser) {
	mocha.setup('bdd')
	setTimeout(() => mocha.run(), 100)
}
// chai isn't yet available as ESM. In Node we're using 'esm' module to wrap it but
// in browser we need to use Require.js version which adds it as global to window object.
export var assert = chai.assert || window.chai.assert

export function createImg(url) {
	var img = document.createElement('img')
	img.src = url
	document.querySelector('#temp')
		.append(img)
	return img
}
/*
export function createBufferOrArrayBuffer(url) {
	if (isNode)
		return fs.readFile(url)
	else
		return createArrayBuffer(url)
}
*/
export function createArrayBuffer(url) {
	return fetch(url).then(res => res.arrayBuffer())
}

export function createBlob(url) {
	return fetch(url).then(res => res.blob())
}

if (isNode) {
	if (typeof __dirname !== 'undefined')
		var dirname = __dirname
	else
		var dirname = path.dirname(import.meta.url.replace('file:///', ''))
}

export function getPath(filepath) {
	if (isNode)
		return path.join(dirname, filepath)
	else
		return filepath
}

export function getUrl(filepath) {
	return location.href
		.split('/')
		.slice(0, -1)
		.concat(filepath)
		.join('/')
		.replace(/\\/g, '/')
}

export function createWorker(input) {
	console.log('createWorker', input)
	return new Promise((resolve, reject) => {
		let worker = new Worker('worker.js')
		worker.postMessage(input)
		worker.onmessage = e => resolve(e.data)
		worker.onerror = reject
	})
}

export async function createObjectUrl(url) {
	return URL.createObjectURL(await createBlob(url))
}

export async function createBase64Url(url) {
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

let cachedFiles = {

}

export async function getFile(urlOrPath) {
	let fullPath = getPath(urlOrPath)
	if (cachedFiles[urlOrPath])
		return cachedFiles[urlOrPath]
	if (isBrowser)
		cachedFiles[urlOrPath] = await fetch(fullPath).then(res => res.arrayBuffer())
	else if (isNode)
		cachedFiles[urlOrPath] = await fs.readFile(fullPath)
	return cachedFiles[urlOrPath]
}