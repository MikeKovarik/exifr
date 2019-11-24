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

export function getPath(filePath) {
	filePath = 'fixtures/' + filePath
	if (isNode)
		return path.join(dirname, filePath)
	else
		return filePath
}

// TODO: need to include 'fixtures/'
export function getUrl(filePath) {
	return location.href
		.split('/')
		.slice(0, -1)
		.concat(filePath)
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


export function testSegmentTranslation({type, file, tags}) {

	describe('translation', () => {

		it(`should translate tag names to string by default`, async () => {
			let input = await getFile(file)
			let options = {mergeOutput: false, [type]: true}
			let output = await parse(input, options)
			let segment = output[type]
			assert.exists(output, `output is undefined`)
			for (let [rawKey, translatedKey] of tags) {
				assert.isUndefined(segment[rawKey])
				assert.exists(segment[translatedKey])
			}
		})

		it(`should translate tag names to string when {translateTags: true}`, async () => {
			let input = await getFile(file)
			let options = {mergeOutput: false, [type]: true, translateTags: true}
			let output = await parse(input, options)
			let segment = output[type]
			assert.exists(output, `output is undefined`)
			for (let [rawKey, translatedKey] of tags) {
				assert.isUndefined(segment[rawKey])
				assert.exists(segment[translatedKey])
			}
		})

		it(`should not translate tag names to string when {translateTags: false}`, async () => {
			let input = await getFile(file)
			let options = {mergeOutput: false, [type]: true, translateTags: false}
			let output = await parse(input, options)
			let segment = output[type]
			assert.exists(output, `output is undefined`)
			for (let [rawKey, translatedKey] of tags) {
				assert.exists(segment[rawKey])
				assert.isUndefined(segment[translatedKey])
			}
		})

		if (Math.max(...tags.map(tag => tag.length)) > 2) {
			// some semgments don't need value translation (IPTC)

			it(`should translate tag values to string by default`, async () => {
				let input = await getFile(file)
				let options = {mergeOutput: false, [type]: true}
				let output = await parse(input, options)
				let segment = output[type]
				assert.exists(output, `output is undefined`)
				for (let [rawKey, translatedKey, rawValue, translatedValue] of tags) {
					let val = translatedValue || rawValue // this is to test non-translatable values
					if (val === undefined) continue
					assert.equal(segment[rawKey] || segment[translatedKey], val) //translatedValue)
				}
			})

			it(`should translate tag values to string when {translateValues: true}`, async () => {
				let input = await getFile(file)
				let options = {mergeOutput: false, [type]: true, translateValues: true}
				let output = await parse(input, options)
				let segment = output[type]
				assert.exists(output, `output is undefined`)
				for (let [rawKey, translatedKey, rawValue, translatedValue] of tags) {
					let val = translatedValue || rawValue // this is to test non-translatable values
					if (val === undefined) continue
					assert.equal(segment[rawKey] || segment[translatedKey], val) //translatedValue)
				}
			})

			it(`should not translate tag values to string when {translateValues: false}`, async () => {
				let input = await getFile(file)
				let options = {mergeOutput: false, [type]: true, translateValues: false}
				let output = await parse(input, options)
				let segment = output[type]
				assert.exists(output, `output is undefined`)
				for (let [rawKey, translatedKey, rawValue, translatedValue] of tags) {
					assert.equal(segment[rawKey] || segment[translatedKey], rawValue)
				}
			})


			it(`should translate tag names & values by default`, async () => {
				let input = await getFile(file)
				let options = {mergeOutput: false, [type]: true}
				let output = await parse(input, options)
				let segment = output[type]
				assert.exists(output, `output is undefined`)
				for (let [rawKey, translatedKey, rawValue, translatedValue] of tags) {
					let val = translatedValue || rawValue
					assert.equal(segment[translatedKey], val)
				}
			})

		}

	})

}


export function testPickOrSkipTags(segKey, filePath, pickTags, skipTags) {
	describe('pick / skip', () => {

		it(`only tags from {pickTags: [...]} are in the output`, async () => {
			let file = await getFile(filePath)
			let options = {mergeOutput: false, [segKey]: true, pickTags}
			let output = await parse(file, options)
			let segment = output[segKey]
			for (let tagKey of pickTags)
				assert.exists(segment[tagKey])
			for (let tagKey of skipTags)
				assert.isUndefined(segment[tagKey])
		})

		it(`tags from {skipTags: [...]} are not in the output`, async () => {
			let file = await getFile(filePath)
			let options = {mergeOutput: false, [segKey]: true, skipTags}
			let output = await parse(file, options)
			let segment = output[segKey]
			for (let tagKey of pickTags)
				assert.exists(segment[tagKey])
			for (let tagKey of skipTags)
				assert.isUndefined(segment[tagKey])
		})

	})
}


export function testImage(segKey, filePath, results = {}) {
	it(`testing parsed properties against file ${filePath}`, async () => {
		let file = await getFile(filePath)
		let options = {mergeOutput: false, [segKey]: true}
		let output = await parse(file, options)
		let segment = output[segKey]
		assert.exists(segment, `output is undefined`)
		for (let [tagKey, tagVal] of Object.entries(results)) {
			assert.equal(segment[tagKey], tagVal)
		}
	})
}
