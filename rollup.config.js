import fs from 'fs'
import babel from 'rollup-plugin-babel'
import notify from 'rollup-plugin-notify'

var pkg = JSON.parse(fs.readFileSync('package.json').toString())
var nodeCoreModules = require('repl')._builtinLibs
var external = [...nodeCoreModules, ...Object.keys(pkg.dependencies || {})]
var globals = objectFromArray(external)

const babelShared = {
	plugins: [
		'@babel/plugin-proposal-class-properties',
	],
}

const babelModern = Object.assign({}, babelShared, {
	presets: [
		[
			'@babel/preset-env',
			{targets: '>1%, not dead, not ie 10-11'}
		],
		['minify', {
			builtIns: false,
			//evaluate: false,
			//mangle: false,
		}]
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

export default [
	{
		input: 'index.mjs',
		plugins: [notify(), babel(babelModern)],
		external,
		output: {
			file: `index.esm.js`,
			format: 'esm',
			globals,
		},
	},
	{
		input: 'index.mjs',
		plugins: [notify(), babel(babelModern)],
		external,
		output: {
			file: `index.umd.js`,
			format: 'umd',
			name: pkg.name,
			amd: {id: pkg.name},
			globals,
		},
	},
	/*
	{
		input: 'index.mjs',
		plugins: [notify(), babel(babelLegacy)],
		external,
		output: {
			file: `index-legacy.umd.js`,
			format: 'umd',
			name: pkg.name,
			amd: {id: pkg.name},
			globals,
		},
	},
	*/
]

function objectFromArray(modules) {
	var obj = {}
	modules.forEach(moduleName => obj[moduleName] = moduleName)
	return obj
}