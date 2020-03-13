import cp from 'child_process'
import util from 'util'
import {assert} from './test-util-core.mjs'
import {getPath, isNode, isBrowser} from './test-util-core.mjs'


isNode && describe('webpack', () => {

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

	it(`builds demo app with exifr without warnings`, async () => {
		if (hasWebPack) {
			let webpackFixturePath = getPath('../webpack')
			let stdout = await execute('webpack', {cwd: webpackFixturePath})
			if (stdout.toLowerCase().includes('warning')) assert.fail(stdout)
		} else {
			console.warn(`couldn't test webpack because it is not installed`)
		}
	})

})


isBrowser && describe('webpack', () => {

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

})
