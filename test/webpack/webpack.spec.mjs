import cp from 'child_process'
import util from 'util'
let exec = util.promisify(cp.exec)


async function run() {
	const { stdout, stderr } = await exec('webpack')
	if (stdout.toLowerCase().includes('warning')) {
		console.log(stdout)
	} else {
		console.log('ok')
	}
}
run()