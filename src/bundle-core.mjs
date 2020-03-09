export * from './highlevel.mjs'
export {Exifr} from './Exifr.mjs'
// for advanced users
export * from './options.mjs'
export {fileParsers, segmentParsers, fileReaders} from './plugins.mjs'
export {tagKeys, tagValues, tagRevivers, createDictionary, extendDictionary} from './tags.mjs'
// undocumented, needed for demo page and tests
export {fetchUrlAsArrayBuffer, readBlobAsArrayBuffer} from './reader.mjs'