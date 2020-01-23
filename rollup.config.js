import babel from 'rollup-plugin-babel'
import notify from 'rollup-plugin-notify'
import pkg from './package.json'

var nodeCoreModules = require('repl')._builtinLibs
var external = [...nodeCoreModules, ...Object.keys(pkg.dependencies || {})]
var globals = objectFromArray(external)

var name = pkg.name
var amd = {id: pkg.name}

const babelShared = {
	plugins: [
		'@babel/plugin-proposal-class-properties',
	],
}

const babelModern = Object.assign({}, babelShared, {
	presets: [
		[
			'@babel/preset-env', {
				targets: '>1%, not dead, not ie 10-11'
			}
		],
		/*
		[
			'minify', {
				builtIns: false,
			}
		]
		*/
	],
	"comments": false
})

const babelLegacy = Object.assign({}, babelShared, {
	presets: [
		[
			'@babel/preset-env',
			{targets: '>0.25%, not dead'}
		],
	],
})

function createEsmBundle(inputPath, outputPath, babelConfig) {
	return {
		input: inputPath,
		plugins: [notify(), babel(babelConfig)],
		external,
		output: {
			file: outputPath,
			format: 'esm',
			globals,
		},
	}
}

function createUmdBundle(inputPath, outputPath, babelConfig) {
	return {
		input: inputPath,
		plugins: [notify(), babel(babelConfig)],
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

export default [
	createEsmBundle('src/index-full.js', 'dist/full.esm.js',         babelModern),
	createUmdBundle('src/index-full.js', 'dist/full.umd.js',         babelModern),
	createUmdBundle('src/index-full.js', 'dist/full.legacy.umd.js',  babelLegacy),
	createEsmBundle('src/index-lite.js', 'dist/lite.esm.js',         babelModern),
	createUmdBundle('src/index-lite.js', 'dist/lite.umd.js',         babelModern),
	createUmdBundle('src/index-lite.js', 'dist/lite.legacy.umd.js',  babelLegacy),
	createEsmBundle('src/index-mini.js', 'dist/mini.esm.js',         babelModern),
	createUmdBundle('src/index-mini.js', 'dist/mini.umd.js',         babelModern),
	createUmdBundle('src/index-mini.js', 'dist/mini.legacy.umd.js',  babelLegacy),
	createEsmBundle('src/index-core.js', 'dist/core.esm.js',         babelModern),
	createUmdBundle('src/index-core.js', 'dist/core.umd.js',         babelModern),
	createUmdBundle('src/index-core.js', 'dist/core.legacy.umd.js',  babelLegacy),
]

function objectFromArray(modules) {
	var obj = {}
	modules.forEach(moduleName => obj[moduleName] = moduleName)
	return obj
}