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
	createEsmBundle('src/index-full.js', 'full.mjs',         babelModern),
	createUmdBundle('src/index-full.js', 'full.cjs',         babelModern),
	createUmdBundle('src/index-full.js', 'full.legacy.cjs',  babelLegacy),
	createEsmBundle('src/index-lite.js', 'lite.mjs',         babelModern),
	createUmdBundle('src/index-lite.js', 'lite.cjs',         babelModern),
	createUmdBundle('src/index-lite.js', 'lite.legacy.cjs',  babelLegacy),
	createEsmBundle('src/index-core.js', 'core.mjs',         babelModern),
	createUmdBundle('src/index-core.js', 'core.cjs',         babelModern),
	createUmdBundle('src/index-core.js', 'core.legacy.cjs',  babelLegacy),
]

function objectFromArray(modules) {
	var obj = {}
	modules.forEach(moduleName => obj[moduleName] = moduleName)
	return obj
}