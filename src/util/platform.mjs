import g from '../polyfill/global.mjs'

export const browser = typeof navigator !== 'undefined'
export const worker = browser && typeof HTMLImageElement === 'undefined'
export const node = !!(typeof global !== 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node)

// Needed for webpack. It otherwise packs 'buffer' npm module with the code
export const Buffer = g.Buffer
// Needed for ESLint. It doesn't yet support global BigInt.
export const BigInt = g.BigInt
export const hasBuffer = !!Buffer