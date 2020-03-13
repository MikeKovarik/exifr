export let g = typeof self !== 'undefined' ? self : global

export var browser = typeof navigator !== 'undefined'
export var worker = browser && typeof HTMLImageElement === 'undefined'
export var node = !!(typeof global !== 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node)

// Needed for webpack. It otherwise packs 'buffer' npm module with the code
export let Buffer = g.Buffer
// Needed for ESLint. It doesn't yet support this global.
export let BigInt = g.BigInt
export var hasBuffer = !!Buffer