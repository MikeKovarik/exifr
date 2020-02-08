import bench from '../benchmark/benchlib.mjs'


let arr1 = [0,1,2,3,4]
let arr2 = [5,6,7,8,9]
let arr3 = [10,11,12]

let set1 = new Set(arr1)
let set2 = new Set(arr2)
let set3 = new Set(arr3)

;(async () => {
	await bench('array[]   ', 30, async () => {
		let arr = []
		for (let i = 0; i < 100; i++)
			arr[i] = i
	})
	await bench('array.push', 30, async () => {
		let arr = []
		for (let i = 0; i < 100; i++)
			arr.push(i)
	})
	await bench('set.add   ', 30, async () => {
		let set = new Set
		for (let i = 0; i < 100; i++)
			set.add(i)
	})

	let merged
	await bench('merge array  ', 300, async () => {
		merged = [...arr1, ...arr2, ...arr3]
	})
	await bench('merge set    ', 300, async () => {
		merged = new Set([...set1, ...set2, ...set3])
	})
	await bench('merge set add', 300, async () => {
		merged = new Set
		for (let item of set1) merged.add(item)
		for (let item of set2) merged.add(item)
		for (let item of set3) merged.add(item)
	})
})()