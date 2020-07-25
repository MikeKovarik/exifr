import {BufferView} from './BufferView.mjs'
import {BigInt} from '../util/platform.mjs'
import {throwError} from '../util/helpers.mjs'


const FULL_20_BITS = 0b11111111111111111111

BufferView.prototype.getUint64 = function(offset) {
	let part1 = this.getUint32(offset)
	let part2 = this.getUint32(offset + 4)
	if (part1 < FULL_20_BITS) {
		// Warning: JS cannot handle 64-bit integers. The number will overflow and cause unexpected result
		// if the number is larger than 53. We try to handle numbers up to 52 bits. 32+21 = 53 out of which
		// one bit is needed for sign. Becase js only does 32 unsinged int (through bitwise operators).
		return (part1 << 32) | part2
	} else if (typeof BigInt !== undefined) {
		// If the environment supports BigInt we'll try to use it. Though it may break user functionality
		// (for example can't do mixed math with numbers & bigints)
		console.warn(`Using BigInt because of type 64uint but JS can only handle 53b numbers.`)
		return (BigInt(part1) << BigInt(32)) | BigInt(part2)
	} else {
		// The value (when both 32b parts combined) is larger than 53 bits so we can't just use Number type
		// and this environment doesn't support BigInt... throw error.
		throwError(`Trying to read 64b value but JS can only handle 53b numbers.`)
	}
}
