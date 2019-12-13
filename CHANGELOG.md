# Changelog

## [Unreleased]

## [3.0.0]

### Breaking changes
- The library now comes in multiple bundles, with varying number of parsers & tag dictonaries.
  - `lite` bundle is now **recommend as the default for browser** use because of its small footprint. It **does not contain all tags** anymore. Only the most important parsers and dictionaries areincluded - TIFF including IFD0, GPS, EXIF but excluding interop and less frequently used tags. You can still use `full` bundle if you need more features of the library.
  - `full` bundle is now the default for node.js (as specified by `"main": "full.mjs"` field in `package.json`). It still contains all parsers and dictionaries out of the box.
  - `core` bundle does not contain any parsers or dictionaries which should be cherry picked and sideloaded.
- `package.json` defined module as `"type": "module"`. All `.js` files in `src/` are treated as ES Modules by Node.js (experimental).
  - using `.cjs` and `.mjs` file extensions instead of `.js` for exported bundles. `index.js` therefore becomes `index.cjs`
- Moved interop & some less used IFD0 tags from default dictionary to `src/tags/tiff-other-keys.js`. It saves library size of the default bundle which caters to average usecase. These tags are still available in full bundle of the library.
- Changed EXIF & IPTC tag dictionary to match [ExifTool](https://exiftool.org/TagNames/EXIF.html). Most tag names remain the same. Some might be changed slightly. You can check out the `src/tags/*` files for refference.
- renamed IFD0 in the output object from `output.image` to `output.ifd0`
- renamed `thumbnailBuffer()` function to `thumbnail()`. It now also returns `Uint8Array` instead of `ArrayBuffer` in browser. Node.js version keeps returning `Buffer`.
- renamed & simplified behavior of `seekChunkSize` and `parseChunkSize`. See `firstChunkSize`, `firstChunkSizeBrowser`, `firstChunkSizeNode`.


### Added
- ICC Parser
- Older browser support
- multiple new output builds (so users can prevent importing unused code)
- more granular options for what segments are parsed, what tags are translated, and what values are transformed
- `getGps()` function

### Changed
- major rewrite of a whole input reader pipeline
    - implemented `BufferView` wrapper class for all forms of binary data.
    - reimplemented chunked reader
- major rewrite of a whole parser pipeline
    - broken the code into separate parser classes & files (TIFF, XMP, IPTC, ICC)
    - TIFF is no longer the main block to be read
    - All APP segments are now first searched in the file and then parsed
    - implemented base parser class than can be used to implement custom APP-segment parsers by user
    - exposed segment parsers
- rewrote readme

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

[Unreleased]: https://github.com/MikeKovarik/exifr/compare/v2.1.3...HEAD
[2.1.3]: https://github.com/MikeKovarik/exifr/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/MikeKovarik/exifr/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/MikeKovarik/exifr/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/MikeKovarik/exifr/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/MikeKovarik/exifr/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/MikeKovarik/exifr/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/MikeKovarik/exifr/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/MikeKovarik/exifr/releases/tag/v1.0.0