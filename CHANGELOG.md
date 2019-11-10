# Changelog

## [Unreleased]

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
[2.1.2]: https://github.com/MikeKovarik/exifr/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/MikeKovarik/exifr/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/MikeKovarik/exifr/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/MikeKovarik/exifr/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/MikeKovarik/exifr/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/MikeKovarik/exifr/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/MikeKovarik/exifr/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/MikeKovarik/exifr/releases/tag/v1.0.0