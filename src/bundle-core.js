import './util/iePolyfill.js'
export * from './highlevel.js'
export {Exifr} from './Exifr.js'
// for advanced users
export * from './options.js'
export {fileParsers, segmentParsers, fileReaders} from './plugins.js'
export {tagKeys, tagValues, tagRevivers, createDictionary, extendDictionary} from './tags.js'
// undocumented, needed for demo page and tests
export {fetchUrlAsArrayBuffer, readBlobAsArrayBuffer} from './reader.js'