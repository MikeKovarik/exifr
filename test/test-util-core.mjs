import chai from 'chai'
import path from 'path'
import {promises as fs} from 'fs'


export var isBrowser = typeof navigator === 'object'
export var isNode = typeof process === 'object' && process.versions && process.versions.node

if (isBrowser) mocha.setup('bdd')

// chai isn't yet available as ESM. In Node we're using 'esm' module to wrap it but
// in browser we need to use Require.js version which adds it as global to window object.
export var assert = chai.assert || window.chai.assert

export var btoa
if (typeof window !== 'undefined' && window.btoa)
	btoa = window.btoa
else
	btoa = string => Buffer.from(string).toString('base64')

if (isNode) {
	var testFolderPath = path.dirname(import.meta.url.replace('file:///', ''))
	if (process.platform !== 'win32' && !path.isAbsolute(testFolderPath))
		testFolderPath = '/' + testFolderPath
} else {
	var testFolderPath = location.href
		.split('/')
		.slice(0, -1)
		.join('/')
}

function ensurePathInFixtures(filePath) {
	if (filePath.includes('fixtures/') || filePath.includes('fixtures\\'))
		return filePath
	else
		return 'fixtures/' + filePath
}

export function getPath(filePath) {
	if (filePath.startsWith('http')) return filePath
	let fileInFixturesPath = ensurePathInFixtures(filePath)
	if (isNode)
		return path.join(testFolderPath, fileInFixturesPath)
	else
		return testFolderPath + '/' + fileInFixturesPath
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

export function createIframe(url) {
	return new Promise((resolve, reject) => {
		let iframe = document.createElement('iframe')
		iframe.src = url
		iframe.style.width = '0px'
		iframe.style.height = '0px'
		iframe.style.opacity = 0
		iframe.onerror = reject
		iframe.onload = e => {
			iframe.contentWindow.onerror = reject
			iframe.contentWindow.testResult = resolve
		}
		document.body.append(iframe)
	})
}

let yellow = '\x1b[33m'
let colorReset = '\x1b[0m'
let warn = console.warn.bind(console)
console.warn = function(...args) {
	warn(yellow, ...args, colorReset)
}

export function assertOutputIsNotEmpty(output) {
	assert.exists(output, `output is undefined`)
}

export function assertOutputWithoutErrors(output) {
	assert.isNotEmpty(output, `output is empty`)
	assert.isUndefined(output.errors, 'there are errors in output')
}

export function assertOutputHasErrors(output) {
	assert.isNotEmpty(output, `output is empty`)
	assert.isUndefined(output.errors, 'there are no errors in output')
}