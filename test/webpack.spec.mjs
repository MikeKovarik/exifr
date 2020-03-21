import cp from 'child_process'
import util from 'util'
import {assert} from './test-util-core.mjs'
import {getFile, getPath, isNode, isBrowser, createIframe} from './test-util-core.mjs'


describe('webpack', () => {

	let hasWebPack = false

	if (isNode) {

		async function execute(...args) {
			let exec = util.promisify(cp.exec)
			try {
				let {stdout, stderr} = await exec(...args)
				if (stderr) assert.fail(stderr)
				return stdout
			} catch(err) {
				if (err.stderr) assert.fail(err.stderr)
				if (err.stdout) assert.fail(err.stdout)
				if (err.message) assert.fail(err.message)
				throw err
			}
		}

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
				if (stdout.includes('ERROR in')) assert.fail(stdout)
			} else {
				console.warn(`couldn't test webpack because it is not installed`)
			}
		})

	}

	let bundleFilePath = '../webpack/dist/bundle.js'

	if (isBrowser) {

		before(async () => {
			try {
				hasWebPack = await fetch(getPath(bundleFilePath)).then(res => res.ok)
			} catch (err) {
				hasWebPack = false
			}
		})

		it(`parses photo properly`, async () => {
			let {umdResult, esmResult} = await createIframe('./webpack/index.html')
			assert.equal(umdResult.Model, 'Canon PowerShot S40')
			assert.equal(esmResult.Model, 'Canon PowerShot S40')
		})

	}

	if (hasWebPack) {

		// isomorphic but needs the webpack bundle to be built first

		it(`webpacked output shouldn't contain Buffer`, async () => {
			let bundleFile = toString(await getFile(bundleFilePath))
			if (bundleFile.includes('The buffer module from node.js, for the browser.'))
				assert.fail('webpack bundled Buffer module with exifr')
		})

	}

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