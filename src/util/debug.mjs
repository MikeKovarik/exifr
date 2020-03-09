const DEFAULT_SIZE = 16

// TODO: delete me before releasing.
// This is for debugging only
DataView.prototype.toString = function(size = DEFAULT_SIZE, name = this.constructor.name) {
	if (typeof size !== 'number') size = DEFAULT_SIZE
	size = Math.min(size, this.byteLength)
	let values = (new Array(size))
		.fill(0)
		.map((val, i) => this.getUint8(i))
		.map(val => val.toString(16).padStart(2, '0'))
		.join(' ')
	if (size < this.byteLength)
		return `<${name} ${values} ... ${this.byteLength - size} more bytes>`
	else
		return `<${name} ${values}>`
}

ArrayBuffer.prototype.toString = function(arg) {
	let view = new DataView(this)
	return view.toString(arg, 'ArrayBuffer')
}

Uint8Array.prototype.toString = function(size = 10) {
	if (typeof size !== 'number') size = DEFAULT_SIZE
	size = Math.min(size, this.byteLength)
	let values = (new Array(size))
		.fill(0)
		.map((val, i) => this[i])
		.map(val => val.toString(16).padStart(2, '0'))
		.join(' ')
	return `<Uint8Array ${values}>`
}

Uint16Array.prototype.toString = function(size = 10) {
	if (typeof size !== 'number') size = DEFAULT_SIZE
	size = Math.min(size, this.byteLength)
	let values = (new Array(size))
		.fill(0)
		.map((val, i) => this[i])
		.map(val => val.toString(16).padStart(4, '0'))
		.join(' ')
	return `<Uint16Array ${values}>`
}