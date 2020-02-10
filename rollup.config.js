import babel from 'rollup-plugin-babel'
import notify from 'rollup-plugin-notify'
import pkg from './package.json'
import {builtinModules} from 'module'
import { terser } from "rollup-plugin-terser"


var external = [...builtinModules, ...Object.keys(pkg.dependencies || {})]
var globals = objectFromArray(external)

var name = pkg.name
var amd = {id: pkg.name}

const emptyFile = 'export default {}'
const emptyFileName = '---TO-BE-IGNORED---'
function ignoreFile(fileName) {
	return {
		resolveId(importPath) {
			if (importPath.endsWith(fileName)) {
				return emptyFileName
			} else {
				return null
			}
		},
		load(importPath) {
			return importPath === emptyFileName ? emptyFile : null;
		},
	};
}

function injectIgnoreComments() {
	return {
		renderChunk(code) {
			return code.replace(`import(`, `import(/* webpackIgnore: true */ `)
		}
	};
}

const terserConfig = {
	compress: true,
	mangle: true,
	toplevel: true
}

const babelShared = {
	plugins: [
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

function createLegacyBundle(inputPath, outputPath) {
	return {
		input: inputPath,
		plugins: [
			ignoreFile('FsReader.js'),
			notify(),
			babel(babelLegacy),
			terser(terserConfig),
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
			babel(babelModern),
			terser(terserConfig),
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
	createModernBundle('src/bundle-full.js','dist/full.esm.js', 'dist/full.umd.js'),
	createModernBundle('src/bundle-lite.js','dist/lite.esm.js', 'dist/lite.umd.js'),
	createModernBundle('src/bundle-mini.js','dist/mini.esm.js', 'dist/mini.umd.js'),
	createModernBundle('src/bundle-core.js','dist/core.esm.js', 'dist/core.umd.js'),
	createLegacyBundle('src/bundle-full.js', 'dist/full.legacy.umd.js'),
	createLegacyBundle('src/bundle-lite.js', 'dist/lite.legacy.umd.js'),
	createLegacyBundle('src/bundle-mini.js', 'dist/mini.legacy.umd.js'),
]

function objectFromArray(modules) {
	var obj = {}
	modules.forEach(moduleName => obj[moduleName] = moduleName)
	return obj
}