# Changelog

## [Unreleased]

## [7.1.3]

### Fixed
- `UrlFetcher` in Node.js can now handle redirects.
- added missing `multiSegment` in .d.ts file.

## [7.1.2]

### Fixed
- Issue #67 -> improved IPTC parsing performance.

## [7.1.0]

### Added
- Sidecar support through `exifr.sidecar()`.
- Support for url query strings and headers in Node.js polyfill of UrlFetcher.

## [7.0.0]

### Added
- `UrlFetcher` now works in Node.js too. i.e. You can use `string` URL as `file` argument in Node.js (previously only available in browser). Exifr now implements polyfill for `window.fetch()`. But it's only available in `full` bundle.

### Fixed
- Issue #59 regarding `mwg-rs:Regions`.
- Problems with parsing absolute paths in Electron, NW.JS and other Node/browser hybrid environments. (*Node's `fs` now takes precedence over brower's `fetch` when parsing absolute path argument*)

### Breaking changes
- Slight changes to XMP parsing logic. Only affects obscure cases with lists and nested `rdf:Description`. Won't affect most of the basic use cases.

## [6.3.0]

### Added

- **AVIF SUPPORT**

## [6.2.0]

### Added

- **EXIF** segment (and thus GPS) extraction from **PNG files**. Only parses the modern `eXIf` chunks and not `zTXt`
- IIQ file support

### Fixed

- `Invalid input argument for BufferView` bug when parsing XMP from TIFF file if the XMP IFD0 tag was of type string (2) instead of byte array (1)
- `Closing file descriptor N on garbage collection` when reading unknown format.

## [6.1.1]

### Fixed

- Encoding in IPTC (issue 47)

## [6.1.0]

### Fixed

- d.ts: typo; additional type for `exifr.rotation()`
- `exifr.rotation()` works correctly on latest macos safari.

## [6.0.0]

### Added

- **PNG SUPPORT** (and IHDR segment parser which implements the PNG header structure)
- IHDR dictionary
- JFIF dictionary - the keys are now in configurable dictionary instead of hardcoded into a parser.

### Fixed

- Orientation bug related to ios and webview (PR 42)
- Reading APP13 Segment not containing IPTC
- Unwrapping value of ExifImageHeight ExifImageWidth in case it is in typed array

## [5.0.6]

### Fixed

- Chunked reading of heic file, related to Issue 35

## [5.0.5]

### Changed

- Nothing new. Re-release of 5.0.4 which was accidentally released with code from 5.0.3.

## [5.0.4]

### Fixed

- Issue 35 - reading heic file if mdat box preceded meta.
- autorotation detection in firefox 77

## [5.0.3]

### Fixed

- Bug: Reading photo in chunked mode where segment header is split between chunks.
- Bug: ICC Text fields (of type 'text') are no longer missing last few characters.
- Bug: IPTC out of range error.

### Changed

- Initial work on reducing the library's filesize
- Slightly improved IPTC performance.

## [5.0.2]

### Fixed

- Updated `exifr.rotation()` with Chrome 81' new autorotation behavior. Applies to all Chromium browsers (like the new Edge).

## [5.0.1]

### Changed

- `"main"` field in package.json now points to `./dist/full.umd.js` instead of `./dist/full.umd.cjs`.

## [5.0.0]

### Changed
- package.json no longer includes `"type": "module"` for now. Tools don't support it yet and `"main"` field was already pointing to UMD (CJS). Source codes were using `.mjs` extension for a while so nothing should break, but it's a major release just in case.

### Added
- `exifr.rotation()`

## [4.3.x]

### Fixed
- `orientation()` in mini bundle (possibly more mini-bundle related bugs)
- bug: **Critical dependency: require function** related to bundling UMD with webpack
- d.ts types
- IE10 DataView related bug

### Added
- `.cjs` copy of all `legacy` builds in dist/.

## [4.3.0]

Quality-Of-Life release. Improves compatibility and ease of use with various tools and environments.

### Changed
- all ESM bundles are now available in two identical copies with different file extensions. `.mjs` and `.js` for ESM, `.cjs` and `.js` for UMD. Just pick one that works with your tooling or environment.
- Backtracking on using only `"type":"module"` in package.json as the only way to define the module as ESM.
- package.json's `"main"` points to UMD bundle `full.esm.mjs` instead of UMD `full.umd.js`.
- Added default export which wraps all named exports into single object.

## [4.2.0]

### Changed
- Simplified and improved implementation of `thumbnail()` and `thumbnailUrl()`.
- Improved typescript types. Added `HTMLImageElement` to `input`.

## [4.1.0]

### Added
- Support for IE10

### Breaking changes (for IE / `legacy` bundle)
- No need to use these polyfills anymore: `TextDecoder`, `Object.assign`, `Object.keys`, `Object.values`, `Object.fromEntries`, `Array.from`, `Array.prototype.includes`, `fetch`, `Map`, `Set`.
- `Promise` polyfill is needed now instead of `regeneratorRuntime`

## [4.0.0]

### Added
- XMP XML Parser
- XMP Extended support. To extract all XMP segments, set `options.multiSegment` or `options.xmp.multiSegment` to true.

### Changed
- `output.xmp` is no longer where the XMP segment data are stored. XMP tags are parsed, grouped by namespace and each namespace is assigned directly to `output` object, like `output.xmlns`, `output.GPano`, `output.crs` and more. This can be disabled by setting `options.xmp.parse: false`

### Fixed
- `window.BigInt` bug in webworker

## [3.0.1]

### Fixed
- Fixed types in d.ts (`String` -> `string`, `Number` -> `number`).

## [3.0.0]

### Breaking changes
#### Exports
- renamed `ExifParser` class to `Exifr`.
- renamed `thumbnailBuffer()` function to `thumbnail()`. It now also returns `Uint8Array` instead of `ArrayBuffer` in browser. Node.js version keeps returning `Buffer`.

#### Output format
- Renamed `options.image` block to `options.ifd0`.
- Renamed `options.thumbnail` block to `options.ifd1`.
- renamed & simplified behavior of `seekChunkSize` and `parseChunkSize`. See `firstChunkSize`, `firstChunkSizeBrowser`, `firstChunkSizeNode`.
- Changed EXIF & IPTC tag dictionary to match [ExifTool](https://exiftool.org/TagNames/EXIF.html). Most tag names remain the same. Some might be changed slightly. You can check out the `src/dicts/*` files for reference. For example: before `{ExposureBiasValue: 0}`, after `{ExposureCompensation: 0}`; before `{WhiteBalance: 'Auto white balance'}`, after `{WhiteBalance: 'Auto'}`

#### Options
- Renamed `output.image` block to `output.ifd0`.
- Renamed `output.thumbnail` block to `output.ifd1`.
- removed `postProcess` property and split its behavior to new properties `sanitize`, `translateKeys`, `translateValues` and `reviveValues`.
- Changed behavior of `options.wholeFile` and renamed to `options.chunked`

#### library bundles
- The library now comes in multiple bundles, with varying number of parsers & tag dictonaries. `lite` bundle is now **recommend as the default for browser** use because of its small footprint.
- Broken down parsers and tag dictionaries into multiple files. No all of them are included in `lite` or `mini` builds.
- `package.json` defined module as `"type": "module"`. All `.js` files are treated as ES Modules by Node.js.

### Added
- ICC Parser
- Older browsers support
- multiple new output builds (so users can prevent importing unused code)
- tags filtering (`pick`/`skip` options)
- `exifr.gps()` 

### Changed
- major rewrite of a whole input reader pipeline
    - implemented `BufferView` wrapper class for all forms of binary data.
    - reimplemented chunked reader
- major rewrite of a whole parser pipeline
    - broken the code into separate parser classes & files (TIFF, XMP, IPTC, ICC)
    - TIFF is no longer the main parser
    - All APP segments are now first searched in the file and then parsed
    - implemented base parser class than can be used to implement custom APP-segment parsers by user
    - exposed segment parsers
- rewrote readme

## [2.1.4] - 2019-11-10

### Changed
- udpated dependencies
- tweaked demo page

## [2.1.3] - 2019-11-10

### Added
- code coverage

## [2.1.2] - 2019-11-09

### Changed
- added project logo
- tweaked demo page UI
- moved demo page to custom domain mutiny.cz & changed links to reflect that

## [2.1.1] - 2019-09-18

### Added
- tests for IPTC
- magic comments for webpack

### Changed
- normalized old tests

## [2.1.0] - 2019-09-12

### Added
- tests for webworker

### Fixed
- webworker bug
- removed dependency on Nodes fs module
- various bugfixes

## [2.0.0] - 2019-07-05

### Breaking changes
- default export is not longer `getExif()` function. It's available as named export `parse()`along few new ones.

### Added
- thumbnail extraction
- better docs and readme

### Fixed
- `*.tif` and `*.tiff` file support (raw TIFF segments not wrapped in jpg APPn segments)
- many bugfixes, typos, stability improvements

## [1.2.0] - 2019-04-27

### Fixed
- issue #1

## [1.1.0] - 2018-09-29

### Added
- AMD module support

## [1.0.0] - 2018-08-01

### Added
- initial implementation

[Unreleased]: https://github.com/MikeKovarik/exifr/compare/7.1.3...HEAD
[7.1.3]: https://github.com/MikeKovarik/exifr/compare/v7.1.2...v7.1.3
[7.1.2]: https://github.com/MikeKovarik/exifr/compare/v7.1.0...v7.1.2
[7.1.0]: https://github.com/MikeKovarik/exifr/compare/v7.0.0...v7.1.0
[7.0.0]: https://github.com/MikeKovarik/exifr/compare/v6.3.0...v7.0.0
[6.3.0]: https://github.com/MikeKovarik/exifr/compare/v6.2.0...v6.3.0
[6.2.0]: https://github.com/MikeKovarik/exifr/compare/v6.1.1...v6.2.0
[6.1.1]: https://github.com/MikeKovarik/exifr/compare/v6.1.0...v6.1.1
[6.1.0]: https://github.com/MikeKovarik/exifr/compare/v6.0.0...v6.1.0
[6.0.0]: https://github.com/MikeKovarik/exifr/compare/v5.0.6...v6.0.0
[5.0.6]: https://github.com/MikeKovarik/exifr/compare/v5.0.5...v5.0.6
[5.0.5]: https://github.com/MikeKovarik/exifr/compare/v5.0.4...v5.0.5
[5.0.4]: https://github.com/MikeKovarik/exifr/compare/v5.0.3...v5.0.4
[5.0.3]: https://github.com/MikeKovarik/exifr/compare/v5.0.2...v5.0.3
[5.0.2]: https://github.com/MikeKovarik/exifr/compare/v5.0.1...v5.0.2
[5.0.1]: https://github.com/MikeKovarik/exifr/compare/v5.0.0...v5.0.1
[5.0.0]: https://github.com/MikeKovarik/exifr/compare/v4.3.3...v5.0.0
[4.3.x]: https://github.com/MikeKovarik/exifr/compare/v4.3.0...v4.3.3
[4.3.0]: https://github.com/MikeKovarik/exifr/compare/v4.2.0...v4.3.0
[4.2.0]: https://github.com/MikeKovarik/exifr/compare/v4.1.0...v4.2.0
[4.1.0]: https://github.com/MikeKovarik/exifr/compare/v4.0.0...v4.1.0
[4.0.0]: https://github.com/MikeKovarik/exifr/compare/v3.0.1...v4.0.0
[3.0.1]: https://github.com/MikeKovarik/exifr/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/MikeKovarik/exifr/compare/v2.1.4...v3.0.0
[2.1.4]: https://github.com/MikeKovarik/exifr/compare/v2.1.3...v2.1.4
[2.1.3]: https://github.com/MikeKovarik/exifr/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/MikeKovarik/exifr/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/MikeKovarik/exifr/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/MikeKovarik/exifr/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/MikeKovarik/exifr/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/MikeKovarik/exifr/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/MikeKovarik/exifr/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/MikeKovarik/exifr/releases/tag/v1.0.0