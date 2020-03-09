export var hasBuffer = typeof Buffer !== 'undefined'
export var browser = typeof navigator !== 'undefined'
export var worker = browser && typeof HTMLImageElement === 'undefined'
export var node = !!(typeof global !== 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node)