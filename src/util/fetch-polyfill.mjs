import dynamicImport from '../util/import.mjs'
import * as platform from '../util/platform.mjs'


// TODO: hide this behid if(platform.node) to prevent loading in browser
const httpPromise  = dynamicImport('http',  http => http)
const httpsPromise = dynamicImport('https', https => https)

export default platform.g.fetch || function(url, {headers} = {}) {
	let {port, hostname, pathname, protocol} = new URL(url)
	const options = {
		method: 'GET',
		hostname,
		path: encodeURI(pathname),
		headers
	}
	if (port !== '') options.port = Number(port)
	return new Promise(async (resolve, reject) => {
		let lib = protocol === 'https:' ? await httpsPromise : await httpPromise
		const req = lib.request(options, res => {
			resolve({
				status: res.statusCode,
				arrayBuffer: () => new Promise(resolveAb => {
					let buffers = []
					res.on('data', buffer => buffers.push(buffer))
					res.on('end', () => resolveAb(concatBuffers(buffers)))
				})
			})
		})
		req.on('error', reject)
		req.end()
	})
}

function concatBuffers(buffers) {
	if (buffers.length > 1)
		return Buffer.concat(buffers)
	else
		return buffers[0]
}