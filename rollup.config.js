import fs from 'fs'
//import commonjs from 'rollup-plugin-commonjs'
import notify from 'rollup-plugin-notify'


var pkg = JSON.parse(fs.readFileSync('package.json').toString())
var nodeCoreModules = require('repl')._builtinLibs
var external = [...nodeCoreModules, ...Object.keys(pkg.dependencies || {})]
external.push('mime/lite')
var globals = objectFromArray(external)

export default {
	treeshake: false,
	input: 'index.mjs',
	output: {
		file: `index.js`,
		format: 'umd',
		name: pkg.name,
		globals,
	},
	plugins: [
		notify(),
		//commonjs(),
	],
	external,
}

function objectFromArray(modules) {
	var obj = {}
	modules.forEach(moduleName => obj[moduleName] = moduleName)
	return obj
}