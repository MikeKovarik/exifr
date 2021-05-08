import global from './global.mjs'
import {set as setFetch} from './fetch.mjs'


if (!global.fetch) {
	setFetch(function(url, options = {}) {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest()
			xhr.open('get', url, true)
			xhr.responseType = 'arraybuffer'
			xhr.onerror = reject
			if (options.headers)
				for (const key in options.headers)
					xhr.setRequestHeader(key, options.headers[key])
			xhr.onload = () => {
				resolve({
					status: xhr.status,
					arrayBuffer: () => Promise.resolve(xhr.response),
				})
			}
			xhr.send(null)
		})
	})
}