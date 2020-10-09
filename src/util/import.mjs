import * as platform from './platform.mjs'


const pass = arg => arg
export default function(name, wrapper = pass) {
	if (platform.node) {
		try {
			return typeof require === 'function'
				? Promise.resolve(wrapper(require(name)))
				: import(/* webpackIgnore: true */ name).then(wrapper)
		} catch(err) {
			console.warn(`Couldn't load ${name}`)
		}
	}
}