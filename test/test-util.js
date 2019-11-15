import chai from 'chai'
import path from 'path'
import {promises as fs} from 'fs'
import {parse} from '../src/index-full.js'


export var isBrowser = typeof navigator === 'object'
export var isNode = typeof process === 'object' && process.versions && process.versions.node

if (isBrowser) {
	mocha.setup('bdd')
	setTimeout(() => mocha.run(), 100)
}
// chai isn't yet available as ESM. In Node we're using 'esm' module to wrap it but
// in browser we need to use Require.js version which adds it as global to window object.
export var assert = chai.assert || window.chai.assert

if (isNode) {
	if (typeof __dirname !== 'undefined')
		var dirname = __dirname
	else
		var dirname = path.dirname(import.meta.url.replace('file:///', ''))
}

export function getPath(filepath) {
	filepath = 'fixtures/' + filepath
	if (isNode)
		return path.join(dirname, filepath)
	else
		return filepath
}

// TODO: need to include 'fixtures/'
export function getUrl(filepath) {
	return location.href
		.split('/')
		.slice(0, -1)
		.concat(filepath)
		.join('/')
		.replace(/\\/g, '/')
}

let cachedFiles = {}

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


export function testSegment({key, fileWith, fileWithout, definedByDefault}) {

	if (definedByDefault) {
		it(`output.${key} is defined by default`, async () => {
			var options = {mergeOutput: false}
			var file = await getFile(fileWith)
			var output = await parse(file, options) || {}
			assert.isDefined(output[key])
		})
	} else {
		it(`output.${key} is undefined by default`, async () => {
			var options = {mergeOutput: false}
			var file = await getFile(fileWith)
			var output = await parse(file, options) || {}
			assert.isUndefined(output[key])
		})
	}

	it(`output.${key} is undefined when {${key}: false}`, async () => {
		var options = {mergeOutput: false, [key]: false}
		var file = await getFile(fileWith)
		var output = await parse(file, options) || {}
		assert.isUndefined(output[key])
	})

	if (fileWithout) {
		it(`output.${key} is undefined if the file doesn't contain the block`, async () => {
			var options = {mergeOutput: false, [key]: true}
			var file = await getFile(fileWithout)
			var output = await parse(file, options) || {}
			assert.isUndefined(output[key])
		})
	}

	it(`output.${key} is defined when {${key}: true}`, async () => {
		var options = {mergeOutput: false, [key]: true}
		var file = await getFile(fileWith)
		var output = await parse(file, options) || {}
		assert.isDefined(output[key])
	})

}


export function testTranslation(type, filePath, ...tags) {

	it(`should translate tag names to string by default`, async () => {
		let input = await getFile(filePath)
		let options = {[type]: true}
		let output = await parse(input, options)
		//console.log(output)
		assert.exists(output, `output is undefined`)
		for (let [rawKey, translatedKey] of tags) {
			assert.isUndefined(output[rawKey])
			assert.exists(output[translatedKey])
		}
	})

	it(`should translate tag names to string when {translateTags: true}`, async () => {
		let input = await getFile(filePath)
		let options = {[type]: true, translateTags: true}
		let output = await parse(input, options)
		//console.log(output)
		assert.exists(output, `output is undefined`)
		for (let [rawKey, translatedKey] of tags) {
			assert.isUndefined(output[rawKey])
			assert.exists(output[translatedKey])
		}
	})

	it(`should not translate tag names to string when {translateTags: false}`, async () => {
		let input = await getFile(filePath)
		let options = {[type]: true, translateTags: false}
		let output = await parse(input, options)
		//console.log(output)
		assert.exists(output, `output is undefined`)
		for (let [rawKey, translatedKey] of tags) {
			assert.exists(output[rawKey])
			assert.isUndefined(output[translatedKey])
		}
	})


	it(`should translate tag values to string by default`, async () => {
		let input = await getFile(filePath)
		let options = {[type]: true}
		let output = await parse(input, options)
		assert.exists(output, `output is undefined`)
		//console.log(output)
		for (let [rawKey, translatedKey, rawValue, translatedValue] of tags) {
			//console.log('output[rawKey] || output[translatedKey]', output[rawKey] || output[translatedKey])
			//console.log('output[translatedKey]', output[translatedKey])
			//console.log('output[rawKey]', output[rawKey])
			//console.log('translatedValue', translatedValue)
			assert.equal(output[rawKey] || output[translatedKey], translatedValue)
		}
	})

	it(`should translate tag values to string when {translateValues: true}`, async () => {
		let input = await getFile(filePath)
		let options = {[type]: true, translateValues: true}
		let output = await parse(input, options)
		//console.log(output)
		assert.exists(output, `output is undefined`)
		for (let [rawKey, translatedKey, rawValue, translatedValue] of tags) {
			assert.equal(output[rawKey] || output[translatedKey], translatedValue)
		}
	})

	it(`should not translate tag values to string when {translateValues: false}`, async () => {
		let input = await getFile(filePath)
		let options = {[type]: true, translateValues: false}
		let output = await parse(input, options)
		//console.log(output)
		assert.exists(output, `output is undefined`)
		for (let [rawKey, translatedKey, rawValue, translatedValue] of tags) {
			assert.equal(output[rawKey] || output[translatedKey], rawValue)
		}
	})


	it(`should translate tag names & values by default`, async () => {
		let input = await getFile(filePath)
		let output = await parse(input)
		//console.log(output)
		assert.exists(output, `output is undefined`)
		for (let [rawKey, translatedKey, rawValue, translatedValue] of tags) {
			assert.equal(output[translatedKey], translatedValue)
		}
	})

}


export function testImage(segKey, filePath, results = {}) {
	it(`testing parsed properties against file ${filePath}`, async () => {
		var file = await getFile(filePath)
		var options = {mergeOutput: false, [segKey]: true}
		var output = await parse(file, options)
		assert.exists(output[segKey], `output is undefined`)
		for (let [key, val] of Object.entries(results)) {
			assert.equal(output[segKey][key], val)
		}
	})
}
