import global from './global.mjs'


export let fetch = global.fetch
export const set = f => fetch = f