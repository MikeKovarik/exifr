import {performance} from 'perf_hooks'


const DEFAULT_ITERATIONS = 10

export default async function bench(name, ...args) {
	let [cb, iterations] = args.reverse()
	iterations = iterations || DEFAULT_ITERATIONS
	let i = 0
	let t1
	let t2
	let times = []
	let skipCount = 5
	//let skipCount = Math.ceil(iterations * 0.4)
	let steps = iterations + skipCount
	for (; i <= steps; i++) {
		global.benchTimes = []
		t1 = performance.now()
		await cb()
		t2 = performance.now()
		if (i > skipCount) {
			times.push(t2 - t1)
			if (global.benchTimes.length) {
				console.log(`----------- iteration ${i} -------------`)
				let nameLengths = Math.max(...global.benchTimes.map(record => record[0].length))
				for (let [name, time] of global.benchTimes)
					console.log(name.padEnd(nameLengths, ' '), ms(time - t1))
			}
		}
	}
	console.log(name, ms(times.reduce((a,b) => a + b, 0) / iterations))
	//console.log(name, times.map(time => time.toFixed(2)).join(' '))
}

function ms(time) {
	return time.toFixed(4) + ' ms'
}


global.recordBenchTime = name => global.benchTimes.push([name, performance.now()])