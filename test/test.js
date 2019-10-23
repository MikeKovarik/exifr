//let options = {cjs: true}
let options = {
	cjs: {
		vars: true
	}
}
require = require('esm')(module, options)
module.exports = require('./test.mjs')