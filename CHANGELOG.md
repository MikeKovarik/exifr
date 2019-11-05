# Changelog

## [Unreleased]

## [3.0.0]

### Breaking changes
- renamed IFD0 in the output object from `output.image` to `output.ifd0`

### Added
- ICC Parser
- Older browser support
- multiple new output builds (so users can prevent importing unused code)
- more granular options for what segments are parsed, what tags are translated, and what values are transformed
- `exifr.getGps()` function

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

[Unreleased]: https://github.com/MikeKovarik/exifr/compare/v2.1.1...HEAD
[2.1.1]: https://github.com/MikeKovarik/exifr/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/MikeKovarik/exifr/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/MikeKovarik/exifr/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/MikeKovarik/exifr/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/MikeKovarik/exifr/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/MikeKovarik/exifr/releases/tag/v1.0.0