import fs from 'fs'
import notify from 'rollup-plugin-notify'

var pkg = JSON.parse(fs.readFileSync('package.json').toString())
var nodeCoreModules = require('repl')._builtinLibs
var external = [...nodeCoreModules, ...Object.keys(pkg.dependencies || {})]
var globals = objectFromArray(external)

export default {
	treeshake: false,
	input: 'index.mjs',
	plugins: [notify()],
	output: {
		file: `index.js`,
		format: 'umd',
		name: pkg.name,
		amd: {id: pkg.name},
		globals,
	},
	external,
}

function objectFromArray(modules) {
	var obj = {}
	modules.forEach(moduleName => obj[moduleName] = moduleName)
	return obj
}