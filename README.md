<img src="https://raw.githubusercontent.com/MikeKovarik/exifr/next-major-rewrite/logo/blue-small.png" width="160" alt="exifr">

[![Build Status](https://travis-ci.org/MikeKovarik/exifr.svg?branch=master)](https://travis-ci.org/MikeKovarik/exifr)
[![Dependency Status](https://david-dm.org/MikeKovarik/exifr.svg)](https://david-dm.org/MikeKovarik/exifr)
[![gzip size](http://img.badgesize.io/https://unpkg.com/exifr/dist/mini.umd.js?compression=gzip)](https://unpkg.com/exifr)
[![Coverage Status](https://coveralls.io/repos/github/MikeKovarik/exifr/badge.svg)](https://coveralls.io/github/MikeKovarik/exifr)
[![NPM Version](https://img.shields.io/npm/v/exifr.svg?style=flat)](https://npmjs.org/package/exifr)
[![License](http://img.shields.io/npm/l/exifr.svg?style=flat)](LICENSE)

📷 The fastest and most versatile JavaScript EXIF reading library.

Try it yourself - [demo page & playground](https://mutiny.cz/exifr/).

## Features

Works everywhere, parses everything and handles anything you throw at it.

* 🏎️ **Fastest EXIF lib**: +-1ms per file
* 🗃️ **Any input**: buffers, url, &lt;img&gt; tag, anything
* 📷 Reads: **.jpg**, **.tif**, **.heic** photos
* 🔎 Parses: **TIFF** (EXIF, GPS, etc...), **XMP**, **ICC**, **IPTC**, **JFIF**
* 📑 Efficient: **Reads only first few bytes**
* 🔬 Filterable: **Skips parsing tags you don't need**
* 🖼️ Extracts thumbnail
* 🧩 Configurable builds
* 📚 Customizable tag dictionaries
* 📋 Simple output
* 🗜️ No dependencies
* ✔ Tested and benchmarked
* 🤙 Promises
* 📦 Bundled as UMD/CJS or ESM
* ✨ Isomorphic: Browser & Node.js
* 🕸 Supports even IE11

## Usage

`file` can be any binary format (`Buffer`, `Uint8Array`, `Blob` and more), `<img>` element, string path or url.

`options` specifies what segments and blocks to parse and filters what tags to pick or skip.

| API | Returns | Description |
|-|-|-|
|`exifr.parse(file)`|`object`|Parses IFD0, EXIF, GPS blocks|
|`exifr.parse(file, true)`|`object`|Parses everything|
|`exifr.parse(file, ['Model', 'FNumber', ...])`|`object`|Parses only specified tags|
|`exifr.parse(file, {options})`|`object`|Custom settings|
|`exifr.gps(file)`|`{latitude, longitude}`|Parses only GPS coords|
|`exifr.thumbnail(file)`|`Uint8Array` binary|Extracts embedded thumbnail|
|`exifr.thumbnailUrl(file)`|`string` Object URL|Browser only|

## Installation

```
npm install exifr
```

You can pick from various builds - `full`, `lite`, `mini`, `core`. In browsers we recommend `mini` or `lite` because of balance between features and file size. [Learn more](#distributions-builds).

**Old Node.js users**: This module is written as ES module. If you still use CommonJS, you need load UMD bundle.

```js
// node.js
import * as exifr from 'exifr' // loads 'full' build by default

// older Node.js or CJS project
var exifr = require('exifr/dist/full.umd.js')

// modern browser
import * as exifr from 'node_modules/exifr/dist/mini.esm.js'
```

**Old browser users**: Also availabe as UMD bundle - compatible with RequireJS, or exports everything as `window.exifr`

```html
<script src="https://unpkg.com/exifr/dist/lite.umd.js"></script>
```

In older browsers you need to use `legacy` build (e.g. `lite.legacy.umd.js`) and polyfills. Learn more at [examples/legacy.html](examples/legacy.html)

## Examples

```js
// exifr reads the file from disk, only a few hundred bytes.
exifr.parse('./myimage.jpg')
  .then(output => console.log('Camera:', output.Make, output.Model))
// Or read the file on your own and feed the buffer into exifr.
fs.readFile('./myimage.jpg')
  .then(exifr.parse)
  .then(output => console.log('Camera:', output.Make, output.Model))
```

Extract only GPS

```js
exifr.gps('./myimage.jpg').then(pos => console.log(pos.latitude, pos.longitude))
```

Extracting thumbnail

```js
let thumbBuffer = await exifr.thumbnail(file)
// or get object URL (browser only)
img.src = await exifr.thumbnailUrl(file)
```

Web Worker

```js
let worker = new Worker('./worker.js')
worker.postMessage('../test/IMG_20180725_163423.jpg')
worker.onmessage = e => console.log(e.data)
// tip: try Transferable Objects with ArrayBuffer
worker.postMessage(arrayBuffer, [arrayBuffer])
```

```js
// worker.js
importScripts('./node_modules/exifr/dist/mini.umd.js')
self.onmessage = async e => postMessage(await exifr.parse(e.data))
```

UMD in Browser

```html
<img src="./myimage.jpg">
<script src="./node_modules/exifr/dist/mini.umd.js"></script>
<script>
  let img = document.querySelector('img')
  window.exifr.parse(img).then(exif => console.log('Exposure:', exif.ExposureTime))
</script>
```

ESM in Browser

```html
<input id="filepicker" type="file" multiple>
<script type="module">
  import {parse} from './node_modules/exifr/dist/mini.esm.js'
  document.querySelector('#filepicker').addEventListener('change', async e => {
    let files = Array.from(e.target.files)
    let exifs = await Promise.all(files.map(parse))
    let dates = exifs.map(exif => exif.DateTimeOriginal.toGMTString())
    console.log(`${files.length} photos taken on:`, dates)
  })
</script>
```

### Demos & more examples

* [playground](https://mutiny.cz/exifr)
* examples/thumbnail.html - [demo](https://mutiny.cz/exifr/examples/thumbnail.html), [code](examples/thumbnail.html)
* examples/worker.html - [demo](https://mutiny.cz/exifr/examples/worker.html), [code](examples/worker.html)
* examples/legacy.html - [demo](https://mutiny.cz/exifr/examples/legacy.html), [code](examples/legacy.html) (view this in IE11)
* examples/benchmark.html - [demo](https://mutiny.cz/exifr/examples/benchmark.html), [code](examples/benchmark.html) (tests speed of processing of various input types)

and a lot more in the [examples/](examples/) folder

## API

exifr exports `parse`, `gps`, `thumbnail`, `thumbnailUrl` functions and `Exifr` class

### `parse(file[, options])` => `Promise<object>`

Accepts [file](#file-argument) (in any format), parses it and returns exif object. Optional [options](#options-argument) argument can be specified.

### `gps(file)` => `Promise<object>`

Extracts only GPS coordinates from photo.

*Uses `pick`/`skip` filters and perf improvements to only extract latitude and longitude tags from GPS block. And to get GPS-IFD pointer it only scans through IFD0 without reading any other unrelated data.*

Check out [examples/gps.js](examples/gps.js) to learn more.

### `thumbnail(file)` => `Promise<Buffer|ArrayBuffer>`

Extracts embedded thumbnail from the photo, returns `Uint8Array`.

*Only parses as little EXIF as necessary to find offset of the thumbnail.*

Check out [examples/thumbnail.html](examples/thumbnail.html) and [examples/thumbnail.js](examples/thumbnail.js) to learn more.

### `thumbnailUrl(file)` => `Promise<string>`, browser only

Exports the thumbnail wrapped in Object URL.

User should to revoke the URL when not needed anymore. [More info here](https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications#Example_Using_object_URLs_to_display_images)

### `Exifr` class

Aforementioned functions are wrappers that internally:
1) instantiate `new Exifr(options)` class
2) call `.read(file)` to read the file
3) call `.parse()` or `.extractThumbnail()`

You can instantiate `Exif` yourself to parse metadata and extract thumbnail efficiently at the same time. In Node.js it's also necessary to close the file with `.file.close()` if it's read in chunked mode.

```js
let exr = new Exifr(options)
let output = await exr.read(file)
let buffer = await exr.extractThumbnail()
if (exr.file.chunked) await exr.file.close()
```

### `file` argument

* `string` file path
* `string` URL
* `string` Base64
* `string` Base64 URL (starting with `data:image/jpeg;base64,`)
* `string` Object URL / Blob URL
* `Buffer`
* `ArrayBuffer`
* `Uint8Array`
* `DataView`
* `Blob` / `File`
* `<img>` element

### `options` argument

* `Array` of tags to parse
* `true` shortcut to parse all segments and blocks
* `object` with granular settings

```js
let defaultOptions = {
  // APP Segments
  jfif: false,
  tiff: true,
  xmp: false,
  icc: false,
  iptc: false,
  // TIFF Blocks
  ifd0: true,
  exif: true,
  gps: true,
  interop: false,
  thumbnail: false,
  // Other TIFF tags
  makerNote: false,
  userComment: false,
  // Filters
  skip: [],
  pick: [],
  // formatters
  translateKeys: true,
  translateValues: true,
  reviveValues: true,
  sanitize: true,
  mergeOutput: true,
  // Chunked reader
  chunked: true,
  firstChunkSize: undefined,
  firstChunkSizeNode: 512,
  firstChunkSizeBrowser: 65536, // 64kb
  chunkSize: 65536, // 64kb
  chunkLimit: 5
}
```

### Tag filters

Exifr can avoid reading certain tags, instead of reading but not including them in the output, like other exif libs do. For example MakerNote tag from EXIF block is isually very large - tens of KBs. Reading such tag is a waste of time if you don't need it.

*Tip: Using numeric tag codes is even faster than string names, because exifr doesn't have to look up the strings in dictionaries.*

#### `options.pick` `Array<string|number>`

Array of the only tags that will be parsed.

```js
{pick: ['ExposureTime', 'FNumber', 'ISO']}
```

```js
// Avoid reading all TIFF blocks, except for GPS block. Of which only GPSLatitude & GPSLongitude is parsed.
{tiff: false, gps: ['GPSLatitude', 0x0004]}
```

```js
// Only read two tags from gps block
{gps: {pick: ['GPSLatitude', 0x0004]}}
```

#### `options.skip` `Array<string|number>` default `['MakerNote', 'UserComments']`

Array of the tags that will not be parsed.

By default MakerNote and UserComment tags are skipped. But that is configured [elsewhere](#notable-tiff-tags).

```js
// Skip reading these three tags in any block
{skip: ['ImageWidth', 'Model', 'FNumber', 'GPSLatitude']}
```
```js
// Skip reading three tags in EXIF block
{exif: {skip: ['ImageUniqueID', 42033, 'SubSecTimeDigitized']}}
```

### Segments & Blocks

EXIF became synonymous for all image metadata, but it's actually just one of many blocks inside TIFF segment. And there are more segment than just TIFF.

#### APP Segments

Jpeg stores various formats of data in APP-Segments. Heic and Tiff file formats use different structures or naming conventions but the idea is the same, so we refer to TIFF, XMP, IPTC, ICC and JFIF as Segments.

* `options.tiff` `<bool|object|Array>` default: `true`
<br>TIFF APP1 Segment - Basic TIFF/EXIF tags, consists of blocks: IFD0 (image), IFD1 (thumbnail), EXIF, GPS
* `options.jfif` `<bool>` default: `false`
<br>JFIF APP0 Segment - Additional info
* `options.xmp` `<bool>` default: `false`
<br>XMP APP1 Segment - additional XML data
* `options.iptc` `<bool>` default: `false`
<br>IPTC APP13 Segment - Captions and copyrights
* `options.icc` `<bool>` default: `false`
<br>ICC APP2 Segment - Color profile

#### TIFF IFD Blocks

TIFF Segment consists of various IFD's (Image File Directories) aka blocks.

* `options.ifd0` (alias `options.image`) `<bool|object|Array>` default: `true`
<br>IFD0 - Basic info about the image
* `options.ifd1` (alias `options.thumbnail`) `<bool|object|Array>` default: `false`
<br>IFD1 - Info about embedded thumbnail
* `options.exif` `<bool|object|Array>` default: `true`
<br>EXIF SubIFD - Detailed info about photo
* `options.gps` `<bool|object|Array>` default: `true`
<br>GPS SubIFD - GPS coordinates
* `options.interop` `<bool|object|Array>` default: `false`
<br>Interop SubIFD - Interoperability info

`options.tiff` serves as a shortcut for managing TIFF blocks:

* `options.tiff = true` enables all TIFF blocks (sets them to `true`).
* `options.tiff = false` disables all TIFF blocks (sets them to `false`).
* `options.tiff = {...}` applies the same sub-options to all TIFF blocks that are enabled.

`options.tiff = false` can be paired with any other block(s) to disable all other blocks except for said block.

```js
{tiff: false, thumbnail: true}
// is a shortcut for
{ifd0: false, exif: false, gps: false, interop: false, thumbnail: true}
```

#### Notable TIFF tags

Notable large tags from EXIF block that are not parsed by default but can be enabed if needed.

* `options.makerNote` `<bool>` default: `false`
<br>0x927C MakerNote tag 
* `options.userComment` `<bool>` default: `false`
<br>0x9286 UserComment tag

#### TIFF Sub-Options

Each TIFF block (`ifd0`, `exif`, `gps`, `interop`, `thumbnail`) or the whole `tiff` segment can be set to:
* `true` - enabled with default or inherited options.
* `false` - disabled, not parsing
* `object` - enabled with custom options 
   * Subset of `options` object.
   * Can locally override [filters](#tag-filters): `pick`, `skip`.
   * Can locally override [formatters](#output-format): `translateKeys`, `translateValues`, `reviveValues`.
   * Undefined properties are inherited from `options` object. TIFF blocks also inherit from `options.tiff` first.
* `Array` - enabled, but only extracts tags from this array
   * List of the only tags to parse. All others are skipped. TODO LINK
   * Sortcut for `{pick: ['tags', ...]}`
   * Can contain both string names and number codes (i.e. `'Make'` or `0x010f`)

TIFF blocks automatically inherit from `options.tiff` and then from `options`.

```js
// Only extract FNumber + ISO tags from EXIF and GPSLatitude + GPSLongitude from GPS
{
  exif: true,
  gps: true,
  pick: ['FNumber', 'ISO', 'GPSLatitude', 0x0004] // 0x0004 is GPSLongitude
}
// is a shortcut for
{
  exif: ['FNumber', 'ISO'],
  gps: ['GPSLatitude', 0x0004]
}
// which is another shortcut for
{
  exif: {pick: ['FNumber', 'ISO']},
  gps: {pick: ['GPSLatitude', 0x0004]}
}
```

```js
// Do not revive any values
{
  reviveValues: false,
  exif: {/* inherits `options.reviveValues` */}
}

// Do not revive any values except for those in EXIF block
{
  reviveValues: false,
  exif: {reviveValues: true}
}
```

### Chunked reader

#### `options.chunked` `bool` default `true`

Exifr can read only few chunks instead of the whole file. It's much faster, saves memory and unnecessary disk reads or network fetches.

Just a few bytes and up to few hundreds of kilobytes will be read, depending on the segments you want to extract and traces of metadata found in the file.

Chunked reading also works with complicated file structures, like .tif files, which points to metadata scattered throughout the file, usually near the end.

#### How does it work

First small chunk (of `firstChunkSize`) is read to determine if the file contains any data at all. If so, reading subsequent chunks (of `chunkSize`) continues until all requested segments are found or until `chunkLimit` is reached.

#### Supported inputs

Chunked mode is only effective if you use `Blob`, `<img>` element, `string` url, disk path, or base64 as an input, because these inputs are not yet processed or read into memory and exifr can handle this expensive operation by chunks.

Each input format is implemented in separate file reader class. Learn more about [file readers and modularity here](#modularity-pugin-api).

#### Reading whole file

You can opt out of chunked reading by `{chunked: false}` if you're not concerned about performance and time (mostly in Node.js).

#### Beware

Fetching chunks (implemented in `UrlFetcher`) from web server uses [HTTP Range Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests). Range request may fail if your server does not support ranges, if it's not configured properly or if the fetched file is smaller than the first chunk size. Test your web server or disable chunked reader with `{chunked: false}` when in doubt.

#### `options.firstChunkSize` `number` default `512` in Node / `65536` in browser

Size (in bytes) of the first chunk that probes the file for traces of exif or metadata. 

Based on platform, one of these values are used for `firstChunkSize`:

* `options.firstChunkSizeNode` default `512`
* `options.firstChunkSizeBrowser` default `65536` (64 KB)

*In browser it's usually better to read just larger chunk in hope that it contains the whole EXIF (and not just the begining) instead of loading mutliple subsequent chunks. Whereas in Node.js it's prefferable to read as little data as possible and `fs.read()` does not cause slowdowns.*

#### `options.chunkSize` `number` default `65536` Bytes (64 KB)

Size of subsequent chunks that may be read after first chunk.

#### `options.chunkLimit` `number` default `5`

Max amount of subsequent chunks allowed to read in which exifr searches for segments and blocks.

This failsafe prevents from reading the whole file if it does not contain all of the segments or blocks requested in `options`.

This limit is bypassed if multi-segment segments occurs in the file and if `options.multiSegment` allows reading all of them.

*If the exif isn't found within N chunks (64\*5 = 320KB) it probably isn't in the file and it's not worth reading anymore.*

### Output format

#### `options.mergeOutput` default: `true`

Merges all parsed segments and blocks into a single object.

**Warning**: `mergeOutput: false` should not be used with `translateKeys: false` or when parsing both `ifd0` and `thumbnail`. Keys are numeric, starting at 0 and they would collide.

<table><tr>
<td>mergeOutput: false</td>
<td>mergeOutput: true</td>
</tr><tr><td><pre>
{
  Make: 'Google',
  Model: 'Pixel',
  FNumber: 2,
  Country: 'Czech Republic',
  xmp: '&lt;x:xmpmeta&gt;&lt;rdf:Description>...'
}
</pre></td><td><pre>
{
  ifd0: {
    Make: 'Google',
    Model: 'Pixel'
  },
  exif: {
    FNumber: 2
  },
  iptc: {
    Country: 'Czech Republic'
  },
  xmp: '&lt;x:xmpmeta&gt;&lt;rdf:Description>...'
}
</pre></td></tr></table>

#### `options.sanitize` default: `true`

Removes:

* IFD Pointer addresses from output of TIFF segment
* `ApplicationNotes` tag (raw `Uint8Array` form of XMP) in .tif files

#### `options.translateKeys` default: `true`

Translates tag keys from numeric codes to understandable string names. I.e. uses `Model` instead of `0x0110`.

Most keys are numeric. To access the `Model` tag use `output.ifd0[0x0110]` or `output.ifd0[272]`

Lean more about [dictionaries](#modularity-pugin-api).

**Warning**: `translateKeys: false` should not be used with `mergeOutput: false`. Keys may collide because ICC, IPTC and TIFF segments use numeric keys starting at 0.

<table><tr>
<td>translateKeys: false</td>
<td>translateKeys: true</td>
</tr><tr><td><pre>{
  // IFD0 tag
  0x0110: 'Pixel',
  // IPTC tag
  90: 'Vsetín',
  // ICC tags
  64: 'Perceptual',
  desc: 'sRGB IEC61966-2.1',
}</pre></td><td><pre>{
  // IFD0 tag
  Model: 'Pixel',
  // IPTC tag
  City: 'Vsetín',
  // ICC tags
  RenderingIntent: 'Perceptual',
  ProfileDescription: 'sRGB IEC61966-2.1',
}</pre></td></tr></table>

#### `options.translateValues` default: `true`

Translates tag values from raw enums to understandable strings.

Lean more about [dictionaries](#modularity-pugin-api).

<table><tr>
<td>translateValues: false</td>
<td>translateValues: true</td>
</tr><tr><td><pre>
{
  Orientation: 1,
  ResolutionUnit: 2,
  DeviceManufacturer: 'GOOG'
}
</pre></td><td><pre>
{
  Orientation: 'Horizontal (normal)',
  ResolutionUnit: 'inches',
  DeviceManufacturer: 'Google'
}
</pre></td></tr></table>

#### `options.reviveValues` default: `true`

Converts dates from strings to Date instances and modifies few other tags to a more readable format.

Lean more about [dictionaries](#modularity-pugin-api).

<table><tr>
<td>reviveValues: false</td>
<td>reviveValues: true</td>
</tr><tr><td><pre>
{
  GPSVersionID: [0x02, 0x02, 0x00, 0x00],
  ModifyDate: '2018:07:25 16:34:23',
}
</pre></td><td><pre>
{
  GPSVersionID: '2.2.0.0',
  ModifyDate: &lt;Date instance: 2018-07-25T14:34:23.000Z&gt;,
}
</pre></td></tr></table>

### Modularity, Pugin API

This is mostly **relevant for Web Browsers**, where file size and unused code elimination is important.

The library's functionality is divided into four categories.

* **File reader** reads different input data structures by chunks.
<br> `BlobReader` (browser), `UrlFetcher` (browser), `FsReader` (Node.js), `Base64Reader`
<br>See [`src/file-parsers/`](src/file-readers).
* **File parser** looks for metadata in different file formats
<br>`.jpg`, `.tiff`, `.heic`
<br>See [`src/file-parsers/`](src/file-parsers).
* **Segment parser** extracts data from various metadata formats (JFIF, TIFF, XMP, IPTC, ICC)
<br>TIFF/EXIF (IFD0, EXIF, GPS), XMP, IPTC, ICC, JFIF
<br>See [`src/segment-parsers/`](src/segment-parsers).
* **Dictionary** affects the way parsed output looks.
<br>See [`src/dicts/`](src/dicts).

Each reader, parser and dictionary is broken into a separate file that can be loaded and used independently. This way you can build your own bundle with only what you need, eliminate dead code and safe tens of KBs of unused dictionaries.

Any file format can be read out of the box. But custom reader class for each format is needed to enable chunked reading.

### Translation dictionaries

EXIF Data are mostly numeric enums, stored under numeric code. Dictonaries are needed to translate them into meaningful output. But they take up a lot of space (40 KB out of `full` build's 60 KB). So it's a good idea to make your own bundle and shave off the dicts you don't need.

* **Key dict** translates object keys from numeric codes to string names (`output.Model` instead of `output[0x0110]`)
* **Value dict** translates vales from enum to string description (`Orientation` becomes `'Rotate 180'` instead of `3`)
* **Reviver** further modifies the value (converts date string to instance of `Date`)

Exifr's dictionaries are based on [exiftool.org](https://exiftool.org). Specifically these: 
TIFF ([EXIF](https://exiftool.org/TagNames/EXIF.html) & [GPS](https://exiftool.org/TagNames/GPS.html)),
[ICC](https://exiftool.org/TagNames/ICC_Profile.html),
[IPTC](https://exiftool.org/TagNames/IPTC.html),
[JFIF](https://exiftool.org/TagNames/JFIF.html)

### Example - Dictionary customization

```js
import {tagKeys, tagValues} from 'exifr'
// Sharpness tag of EXIF block
let TAG = 0xa409
// get dictionaries
let exifKeys   = tagRevivers.get('exif')
let exifValues = tagKeys.get('exif')
// extend or edit dictionaries
exifKeys.set(TAG, 'Saturation')
exifValues.set(TAG, {
  0: 'Normal',
  1: 'Low',
  2: 'High'
})
```

```js
import {tagRevivers} from 'exifr'
// modify how GPSDateStamp value is processed
let gpsRevivers = tagRevivers.get('gps')
gpsRevivers.set(0x001D, rawValue => {
  let [year, month, day] = rawValue.split(':').map(str => parseInt(str))
  return new Date(year, month - 1, day)
})
```

### Example - Build your own exifr

Check out [examples/custom-build.js](examples/custom-build.js).

Scenario 1: We're using `lite` build and it's ok, but some tags are left untranslated. To fix that we need to import extension of TIFF dictionary with less frequent tags.

```js
// Lite bundle only contains basic set of TIFF tags
import * as exifr from 'exifr/dist/lite.esm.js'
// Load TIFF dict extension with names of less frequent tags.
import 'exifr/src/dicts/tiff-other-keys.js'
```

Scenario 2: We'll be handling `.jpg` files in blob format and we want to extract ICC data in human readable format. For that we'll need dictionaries for ICC segment.

```js
// Core bundle has nothing in it
import * as exifr from 'exifr/dist/core.esm.js'
// Now we import what we need
import 'exifr/src/file-readers/BlobReader.js'
import 'exifr/src/file-parsers/jpeg.js'
import 'exifr/src/segment-parsers/icc.js'
import 'exifr/src/dicts/icc-keys.js'
import 'exifr/src/dicts/icc-values.js'
```

Scenario 3: We want to parse `.heic` and `.tiff` photos, extract EXIF block (of TIFF segment). We only need the values to be translated. Keys will be left untranslated but we dont mind accessing them with raw numeric keys - `output[0xa40a]` instead of `output.Sharpness`. Also we're not importing any (chunked) file reader because we only work with Uint8Array data.

```js
import * as exifr from 'exifr/dist/core.esm.js'
import 'exifr/src/file-parsers/heic.js'
import 'exifr/src/file-parsers/tiff.js'
import 'exifr/src/segment-parsers/tiff.js'
import 'exifr/src/dicts/tiff-exif-values.js'
```

## Distributions (builds)

Exifr comes in four prebuilt bundles. It's a good idea to start development with `full` and then scale down to `lite`, `mini`, or better yet, build your own around `core` build.

Need to support older browsers? Use `legacy` build along with polyfills. Learn more about IE11 at [examples/legacy.html](examples/legacy.html)

* **full** - Contains everything. Intended for use in Node.js.
* **lite** - Reads JPEG and HEIC. Parses TIFF/EXIF and XMP. Includes chunked reader.
* **mini** - Stripped down to basics. Parses most useful TIFF/EXIF  from JPEGs. Does not include dictonaries, nor chunked reader. 
* **core** - Contains nothing. It's up to you to import readers, parser and dictionaries you need.

Of course you can use `full` version in browser, or use any other build in Node.js.

|                 | full | lite | mini | core |
|-----------------|------|------|------|------|
| inputs          | `ArrayBuffer`<br>`Buffer`<br>`Uint8Array`<br>`DataView`<br>`Blob`/`File`<br>url string<br>path string<br>base64 string or url | `ArrayBuffer`<br>`Buffer`<br>`Uint8Array`<br>`DataView`<br>`Blob`/`File`<br>url string<br>path string | `ArrayBuffer`<br>`Buffer`<br>`Uint8Array`<br>`DataView`<br>`Blob`/`File`<br>url string | `ArrayBuffer`<br>`Buffer`<br>`Uint8Array`<br>`DataView`<br>`Blob`/`File`<br>url string |
| file readers    | BlobReader<br>UrlFetcher<br>FsReader<br>Base64Reader | BlobReader<br>UrlFetcher | BlobReader | none |
| file parsers    | `*.jpg`<br>`*.heic`<br>`*.tif` | `*.jpg`<br>`*.heic` | `*.jpg` | none |
| segment parsers | TIFF (EXIF) + less frequent tags<br>IPTC<br>XMP<br>ICC<br>JFIF | TIFF (EXIF)<br>XMP | TIFF (EXIF) | none |
| dictionaries    | extended TIFF (everything, including less frequent tags)<br>IPTC<br>ICC | basic TIFF (IFD0, EXIF, GPS) | none | none |
| size +-         | 60 Kb | 40 Kb | 25 Kb | 15 Kb |
| gzipped         | 22 Kb | 12 Kb | 8 Kb  | 4 Kb  |
| file            | `dist/full.esm.js`<br>`dist/full.umd.js`<br>`dist/full.legacy.umd.js` | `dist/lite.esm.js`<br>`dist/lite.umd.js`<br>`dist/lite.legacy.umd.js` | `dist/mini.esm.js`<br>`dist/mini.umd.js`<br>`dist/mini.legacy.umd.js` | `dist/core.esm.js`<br>`dist/core.umd.js` |

## Usage with Webpack, Parcel, Rollup and other bundlers.

Under the hood exifr dynamically imports Node.js `fs` module. The import is obviously only used in Node.js and not triggered in browser. But your bundler may however pick up on it and fail with something like `Error: Can't resolve 'fs'`.

Parcel works out of the box and Webpack should too because we added the ignore magic comment to the library's source code `import(/* webpackIgnore: true */ 'fs')`.

If this does not work for you, try adding `node: {fs: 'empty'}` and `target: 'web'` or `target: 'webworker'` to your Webpack config. Or try adding similar settings to your bundler of choice.

Alternatively create your own bundle around `core` build and do not include `FsReader` in it.

## Notable breaking changes / Migration from 2.x.x to 3.0.0

Complete list of breaking changes is in [`CHANGELOG.md`][changelog]

1) Changed EXIF & IPTC tag dictionary to match [ExifTool](https://exiftool.org/TagNames/EXIF.html). Most tags should stay the same, but expect some changed. For example:
<br>before `{ExposureBiasValue: 0}`, after `{ExposureCompensation: 0}`
<br>before `{WhiteBalance: 'Auto white balance'}`, after `{WhiteBalance: 'Auto'}`
2) Renamed `image` block to `ifd0` and `thumbnail` to `ifd1`. This applies to options (`options.ifd0` instead of `options.image`) as well as output (the data is not `output.ifd1` instead of `output.thumbnail`)
3) Renamed `ExifParser` class to `Exifr`.
4) Renamed `thumbnailBuffer` to `thumbnail`
5) Changed behavior of `options.wholeFile` and renamed to `options.readChunked`

```js
// 2.x.x
import * as exifr from 'exifr'
exifr.thumbnailBuffer()
// 3.0.0
import * as exifr from 'exifr'
exifr.thumbnail()
```

## XMP

Exifr does not come with an XML parser out of the box to keep the library simple and light-weight. There's plenty of XML parsers on npm. Exifr only extracts the XMP string and you can parse it.

You can also inject XML parser into exifr and have it process the XMP string.

```js
// Exifr offers you an API for using your own XML parser while parsing XMP.
// 1) get the XmlParser class.
let XmpParser = Exifr.segmentParsers.get('xmp')
// 2) Implement parseXml() method. It accepts string argument. What is returned ends up as output.xmp.
XmpParser.prototype.parseXml = function(xmpString) {
  return 'Bring Your Own XML parser here: ' + xmpString
}
```

## Performance

### Tips for better performance

Here are a few tips for when you need to squeeze an extra bit of speed out of exifr when processing large amount of files.

#### Use `options.pick` if you only need certain tags

Unlike other libraries, exifr can only parse certain tags, avoid unnecessary reads and end when the last picked tag was found.

```js
// do this:
let output = await exifr.parse(file, {exif: ['ExposureTime', 'FNumber']})
// not this:
let {ExposureTime, FNumber} = await exifr.parse(file)
```

#### Disable `options.ifd0` if you don't need the data

`ifd0`, `exif` and `gps` blocks are enabled by default.

Even though IFD0 (Image block) stores pointers to EXIF and GPS blocks and is thus necessary to be parsed to access said blocks. Exifr doesn't need to read the whole IFD0, it just looks for the pointers.

```js
// do this:
let options = {ifd0: false, exif: true} 
// not this:
let options = {exif: true} 
```

#### Use `exifr.gps()`

If you only need to extract GPS coords, use `exifr.gps()` because it is fine tuned to do exactly this and nothing more.

```js
// do this:
exifr.gps(file)
// not this:
exifr.parse(file, {gps: true})
```

#### Cache `options` object

If you parse multiple files with the same settings, you should cache the `options` object instead of inlining it. Exifr uses your `options` to create instance of `Options` class under the hood and uses `WeakMap` to find previously created instance instead of creating new one each time.

```js
// do this:
let options = {exif: true, iptc: true}
for (let file of files) exif.parse(file, options)
// not this:
for (let file of files) exif.parse(file, {exif: true, iptc: true})
```

### Remarks

As you've already read, this lib was built to be fast. Fast enough to handle whole galleries.

We're able to parse image within a couple of milliseconds (tens of millis on phones) thanks to selective disk reads (Node.js) and Blob / ArrayBuffer (Browser) manipulations. Because you don't need to read the whole file and parse through a MBs of data if we an educated guess can be made to only read a couple of small chunks where EXIF usually is. Plus each supported data type is approached differently to ensure the best performance.

#### Benchmarks

Try the benchmark yourself at [benchmark/chunked-vs-whole.js](https://github.com/MikeKovarik/exifr/blob/master/benchmark/chunked-vs-whole.js)

```
user reads file            8.4846 ms
exifr reads whole file     8.2180 ms
exifr reads file by chunks 0.5459 ms  <--- !!!
only parsing, not reading  0.2571 ms  <--- !!!
```

Observations from testing with +-4MB pictures (*Highest quality Google Pixel photos. Tested on a mid range dual core i5 machine with SSD*).

* Node: Parsing after `fs.readFile` = 0.3ms
* Node: Reading & parsing by chunks = 0.5ms
* Browser: Processing `ArrayBuffer` = 3ms
* Browser: Processing `Blob` = 7ms
* Browser: `<img>` with Object URL = 3ms
* Drag-n-dropping gallery of 90 images and extracting GPS data takes about 100ms.
* Phones are about 4x slower. Usually 4-30ms per photo.

Be sure to visit [**the exifr playground**](https://mutiny.cz/exifr), drop in your photos and watch the *parsed in* timer.

#### HEIC

Other libraries use brute force to read through all bytes until 'Exif' string is found. Whereas exifr recognizes the file structure which consists of nested boxes. This allows exifr to read just a few bytes here and there, to get sizes of the box and pointers to jump to next.

Simply finding the exif offset takes 0.2-0.3ms with exifr. Compare that to [https://github.com/exif-heic-js/exif-heic-js](https://github.com/exif-heic-js/exif-heic-js) which takes about 5-10ms on average. That's up to 30x faster.

## Licence

MIT, Mike Kovařík, Mutiny.cz

<!-- links -->

[changelog]: https://github.com/mozilla/learning.mozilla.org/blob/master/CHANGELOG.md
