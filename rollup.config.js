import {promises as fs} from 'fs'
import {builtinModules} from 'module'
import {fileURLToPath} from 'url'
import path from 'path'
import babel from 'rollup-plugin-babel'
import notify from 'rollup-plugin-notify'
import {terser} from 'rollup-plugin-terser'
import * as polyfills from './src/util/iePolyfill.mjs'
import pkg from './package.json'


function replaceBuiltinsWithIePolyfills() {
	// list of things that needs to be translated
	var translatables = [
		['Object.keys',        'ObjectKeys'],
		['Object.values',      'ObjectValues'],
		['Object.entries',     'ObjectEntries'],
		['Object.assign',      'ObjectAssign'],
		['Object.fromEntries', 'ObjectFromEntries'],
		['Array.from',         'ArrayFrom'],
		['new Set',            'NewSet'],
		['new Map',            'NewMap'],
		['Number.isNaN',       'isNaN'],
	]
	// keys of translatables and builtings (like fetch)
	let polyfillKeys = Object.keys(polyfills)
	let exifrDir = path.dirname(fileURLToPath(import.meta.url))
	let polyFilePath = path.join(exifrDir, './src/util/iePolyfill.mjs')
	function createImportLine(keys, importPath) {
		return `import {${keys.join(', ')}} from '${importPath}'\n`
	}
	function createRelativeImportPath(filePath) {
		let importPath = path
			.relative(path.dirname(filePath), polyFilePath)
			.replace(/\\/g, '/')
		if (!importPath.startsWith('.')) importPath = './' + importPath
		return importPath
	}
	return {
		async transform(code, filePath) {
			if (!filePath.includes('exifr')) return null
			if (filePath.endsWith('iePolyfill.mjs')) return null
			for (let [from, to] of translatables)
				code = code.replace(new RegExp(from, 'g'), to)
			let importPath = createRelativeImportPath(filePath)
			let importLine = createImportLine(polyfillKeys, importPath)
			code = importLine + '\n' + code
			return code
		}
	}
}

function replaceFile(fileName, replacement = 'export default {}') {
	const targetId = 'replace-' + Math.round(Math.random() * 10000)
	return {
		resolveId(importPath) {
			return importPath.endsWith(fileName) ? targetId : null
		},
		load(importPath) {
			return importPath === targetId ? replacement : null
		},
	}
}

// IE10 doesn't copy static methods to inherited classes. Babel know about it for years
// but they are stubborn to do anything about it. So we inject the method copying to their _inherits().
function fixIeStaticMethodSubclassing() {
	let searched = 'if (superClass) _setPrototypeOf'
	let injection = `
	var builtins = ['prototype', '__proto__', 'caller', 'arguments', 'length', 'name']
	Object.getOwnPropertyNames(superClass).forEach(function(key) {
		if (builtins.indexOf(key) !== -1) return
		if (subClass[key] !== superClass[key]) subClass[key] = superClass[key]
	})`
	let replacement = injection + '\n' + searched
	return {
		renderChunk(code) {
			return code.replace(searched, replacement)
		}
	}
}

// Webpack magic comment to ignore import('fs')
function injectIgnoreComments() {
	return {
		renderChunk(code) {
			return code.replace(`import(`, `import(/* webpackIgnore: true */ `)
		}
	}
}

function cloneCjsAndMjsToJs() {
	return {
		writeBundle(bundle) {
			let newFileName = bundle.file.replace('.cjs', '.js').replace('.mjs', '.js')
			fs.copyFile(bundle.file, newFileName)
		}
	}
}

const terserConfig = {
	compress: true,
	mangle: true,
	toplevel: true
}

const babelPlugins = [
	//'@babel/plugin-proposal-nullish-coalescing-operator',
	//'@babel/plugin-proposal-optional-chaining',
	'@babel/plugin-proposal-class-properties',
	'@babel/plugin-proposal-optional-chaining',
	'@babel/plugin-syntax-dynamic-import',
]

const babelModern = {
	plugins: babelPlugins,
	presets: [
		['@babel/preset-env', {
			targets: '>1%, not dead, not ie 10-11'
		}],
		
	],
	"comments": false
}

const babelLegacy = {
	plugins: [
		...babelPlugins,
		//'./src/util/babel-plugin-transform-for-of-array-to-array.cjs',
		'babel-plugin-transform-for-of-without-iterator',
		'babel-plugin-transform-async-to-promises',
		// select es2015 preset builtins
		'@babel/plugin-transform-arrow-functions',
		'@babel/plugin-transform-block-scoping',
		'@babel/plugin-transform-classes',
		'@babel/plugin-transform-computed-properties',
		['@babel/plugin-transform-destructuring', {loose: true, useBuiltIns: true}],
		'@babel/plugin-transform-duplicate-keys',
		'@babel/plugin-transform-function-name',
		'@babel/plugin-transform-literals',
		'@babel/plugin-transform-parameters',
		'@babel/plugin-transform-shorthand-properties',
		['@babel/plugin-transform-spread', {loose: true}],
		'@babel/plugin-transform-template-literals',
	],
}

var external = [...builtinModules, ...Object.keys(pkg.dependencies || {})]
var globals = objectFromArray(external)

var name = pkg.name
var amd = {id: pkg.name}

function createLegacyBundle(inputPath, outputPath) {
	return {
		input: inputPath,
		plugins: [
			notify(),
			replaceFile('FsReader.mjs', 'export default {}'),
			replaceFile('import.mjs',   'export default function() {}'),
			babel(babelLegacy),
			replaceBuiltinsWithIePolyfills(),
			fixIeStaticMethodSubclassing(),
			terser(terserConfig),
			cloneCjsAndMjsToJs(),
		],
		external,
		output: {
			file: outputPath,
			format: 'umd',
			exports: 'named',
			name,
			amd,
			globals,
		},
	}
}

function createModernBundle(inputPath, esmPath, umdPath) {
	return {
		input: inputPath,
		plugins: [
			notify(),
			babel(babelModern),
			terser(terserConfig),
			injectIgnoreComments(),
			cloneCjsAndMjsToJs(),
		],
		external,
		output: [
			{
				file: esmPath,
				format: 'esm',
				exports: 'named',
				globals,
			},
			{
				file: umdPath,
				format: 'umd',
				exports: 'named',
				globals,
				name,
				amd,
			}
		]
	}
}

export default args => {
	let [bundle] = args.input || []
	if (typeof args.watch === 'string') {
		bundle = args.watch
		args.watch = args.w = true
	}
	let output = []
	if (bundle === 'full' || bundle === undefined) {
		delete args.input
		output.push(
			createModernBundle('src/bundles/full.mjs', 'dist/full.esm.mjs', 'dist/full.umd.cjs'),
			createLegacyBundle('src/bundles/full.mjs', 'dist/full.legacy.umd.cjs'),
		)
	}
	if (bundle === 'lite' || bundle === undefined) {
		delete args.input
		output.push(
			createModernBundle('src/bundles/lite.mjs', 'dist/lite.esm.mjs', 'dist/lite.umd.cjs'),
			createLegacyBundle('src/bundles/lite.mjs', 'dist/lite.legacy.umd.cjs'),
		)
	}
	if (bundle === 'mini' || bundle === undefined) {
		delete args.input
		output.push(
			createModernBundle('src/bundles/mini.mjs', 'dist/mini.esm.mjs', 'dist/mini.umd.cjs'),
			createLegacyBundle('src/bundles/mini.mjs', 'dist/mini.legacy.umd.cjs'),
		)
	}
	// TO BE WORKED ON
	/*
	if (bundle === 'nano' || bundle === undefined) {
		delete args.input
		output.push(
			createModernBundle('src/bundles/nano.mjs', 'dist/nano.esm.mjs', 'dist/nano.umd.cjs'),
			createLegacyBundle('src/bundles/nano.mjs', 'dist/nano.legacy.umd.cjs'),
		)
	}
	*/
	return output
}

function objectFromArray(modules) {
	var obj = {}
	modules.forEach(moduleName => obj[moduleName] = moduleName)
	return obj
}