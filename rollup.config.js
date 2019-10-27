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

export default [
	{
		input: 'src/index.mjs',
		plugins: [notify(), babel(babelModern)],
		external,
		output: {
			file: `index.mjs`,
			format: 'esm',
			globals,
		},
	},
	{
		input: 'src/index.mjs',
		plugins: [notify(), babel(babelModern)],
		external,
		output: {
			file: `index.js`,
			format: 'umd',
			name,
			amd,
			globals,
		},
	},
	{
		input: 'src/index.mjs',
		plugins: [notify(), babel(babelLegacy)],
		external,
		output: {
			file: `index.legacy.js`,
			format: 'umd',
			name,
			amd,
			globals,
		},
	},
]

function objectFromArray(modules) {
	var obj = {}
	modules.forEach(moduleName => obj[moduleName] = moduleName)
	return obj
}