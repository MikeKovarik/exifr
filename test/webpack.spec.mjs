import cp from 'child_process'
import util from 'util'
import {assert} from './test-util-core.mjs'
import {getFile, getPath, isNode, isBrowser} from './test-util-core.mjs'


describe('webpack', () => {

	if (isNode) {

		async function execute(...args) {
			let exec = util.promisify(cp.exec)
			try {
				let {stdout, stderr} = await exec(...args)
				if (stderr) throw stderr
				return stdout
			} catch(err) {
				throw err
			}
		}

		let hasWebPack = false
		before(async () => {
			try {
				const stdout = await execute('webpack -v')
				hasWebPack = !!stdout.trim().match(/\d+\.\d+\.\d+/)
			} catch (err) {
				hasWebPack = false
			}
		})

		it(`builds demo app with exifr without warnings`, async function() {
			this.timeout(5000)
			if (hasWebPack) {
				let webpackFixturePath = getPath('../webpack')
				let stdout = await execute('webpack', {cwd: webpackFixturePath})
				if (stdout.toLowerCase().includes('warning')) assert.fail(stdout)
			} else {
				console.warn(`couldn't test webpack because it is not installed`)
			}
		})

	}

	if (isBrowser) {

		it(`parses photo properly`, async () => {
			let {umdResult, esmResult} = await new Promise((resolve, reject) => {
				let iframe = document.createElement('iframe')
				iframe.src = './webpack/index.html'
				iframe.style.width = '0px'
				iframe.style.height = '0px'
				iframe.style.opacity = 0
				iframe.onerror = reject
				iframe.onload = e => {
					iframe.contentWindow.onerror = reject
					iframe.contentWindow.testResult = resolve
				}
				document.body.append(iframe)
			})
			assert.equal(umdResult.Model, 'Canon PowerShot S40')
			assert.equal(esmResult.Model, 'Canon PowerShot S40')
		})

	}

	it(`webpacked output shouldn't contain Buffer`, async () => {
		let bundleFilePath = '../webpack/dist/bundle.js'
		let bundleFile = toString(await getFile(bundleFilePath))
		if (bundleFile.includes('The buffer module from node.js, for the browser.'))
			assert.fail('webpack bundled Buffer module with exifr')
	})

})

function toString(buffer) {
	if (buffer instanceof ArrayBuffer) {
		let uint8 = new Uint8Array(buffer)
		let decoder = new TextDecoder()
		return decoder.decode(uint8)
	} else {
		return buffer.toString()
	}
}