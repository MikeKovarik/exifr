import {promises as fs} from 'fs'
import path from 'path'
import babel from 'rollup-plugin-babel'
import notify from 'rollup-plugin-notify'
import pkg from './package.json'
import {builtinModules} from 'module'
import {terser} from 'rollup-plugin-terser'
import * as polyfills from './src/util/iePolyfill.js'


function replaceBuiltinsWithIePolyfills() {
	// list of things that needs to be translated
	var translatables = [
		['Object.keys',        'ObjectKeys'],
		['Object.values',      'ObjectValues'],
		['Object.entries',     'ObjectEntries'],
		['Object.assign',      'ObjectAssign'],
		['Object.fromEntries', 'ObjectFromEntries'],
		['Array.from',         'ArrayFrom'],
	]
	// keys of translatables and builtings (like fetch)
	let polyfillKeys = Object.keys(polyfills)
	let rollupFilePath = path.dirname(import.meta.url.replace('file:///', ''))
	let polyFilePath = path.join(rollupFilePath, './src/util/iePolyfill.js')
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
			if (filePath.endsWith('iePolyfill.js')) return null
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

function injectIgnoreComments() {
	return {
		renderChunk(code) {
			return code.replace(`import(`, `import(/* webpackIgnore: true */ `)
		}
	}
}

const terserConfig = {
	compress: true,
	mangle: true,
	toplevel: true
}

const babelShared = {
	plugins: [
		//'@babel/plugin-proposal-nullish-coalescing-operator',
		//'@babel/plugin-proposal-optional-chaining',
		'@babel/plugin-proposal-class-properties',
	],
}

const babelModern = Object.assign({}, babelShared, {
	presets: [
		['@babel/preset-env', {
			targets: '>1%, not dead, not ie 10-11'
		}],
		
	],
	"comments": false
})

const babelLegacy = Object.assign({}, babelShared, {
	presets: [
		['@babel/preset-env', {
			targets: '>0.25%, not dead'
		}],
	],
})

var external = [...builtinModules, ...Object.keys(pkg.dependencies || {})]
var globals = objectFromArray(external)

var name = pkg.name
var amd = {id: pkg.name}

function createLegacyBundle(inputPath, outputPath) {
	return {
		input: inputPath,
		plugins: [
			notify(),
			replaceFile('FsReader.js'),
			replaceBuiltinsWithIePolyfills(),
			babel(babelLegacy),
			//terser(terserConfig),
		],
		external,
		output: {
			file: outputPath,
			format: 'umd',
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
			replaceFile('iePolyfill.js'),
			replaceFile('ieFix.js', 'export function fixIeSubclassing() {}'),
			babel(babelModern),
			//terser(terserConfig),
			injectIgnoreComments()
		],
		external,
		output: [{
			file: umdPath,
			format: 'umd',
			name,
			amd,
			globals,
		}, {
			file: esmPath,
			format: 'esm',
			globals,
		}],
	}
}

export default [
	/*
	createModernBundle('src/bundle-full.js','dist/full.esm.js', 'dist/full.umd.js'),
	createModernBundle('src/bundle-lite.js','dist/lite.esm.js', 'dist/lite.umd.js'),
	createModernBundle('src/bundle-mini.js','dist/mini.esm.js', 'dist/mini.umd.js'),
	createModernBundle('src/bundle-core.js','dist/core.esm.js', 'dist/core.umd.js'),
	*/
	createLegacyBundle('src/bundle-full.js', 'dist/full.legacy.umd.js'),
	/*
	createLegacyBundle('src/bundle-lite.js', 'dist/lite.legacy.umd.js'),
	createLegacyBundle('src/bundle-mini.js', 'dist/mini.legacy.umd.js'),
	*/
]

function objectFromArray(modules) {
	var obj = {}
	modules.forEach(moduleName => obj[moduleName] = moduleName)
	return obj
}