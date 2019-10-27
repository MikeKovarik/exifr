import fs from 'fs'
import babel from 'rollup-plugin-babel'
import notify from 'rollup-plugin-notify'

var pkg = JSON.parse(fs.readFileSync('package.json').toString())
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
	createEsmBundle('src/index.mjs',       'index.mjs',             babelModern),
	createUmdBundle('src/index.mjs',       'index.js',              babelModern),
	createUmdBundle('src/index.mjs',       'index.legacy.js',       babelLegacy),
	createEsmBundle('src/lightweight.mjs', 'lightweight.mjs',       babelModern),
	createUmdBundle('src/lightweight.mjs', 'lightweight.js',        babelModern),
	createUmdBundle('src/lightweight.mjs', 'lightweight.legacy.js', babelLegacy),
]

function objectFromArray(modules) {
	var obj = {}
	modules.forEach(moduleName => obj[moduleName] = moduleName)
	return obj
}