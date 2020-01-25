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

Works everywhere and accepts pretty much everything you throw at it.

* **Isomorphic**.
<br> *Works in Node.js and Browsers.*
* **Handles any input**
<br> *`Buffer`, `ArrayBuffer`, `Uint8Array`, `DataView`, `<img>` elements, string URL and paths, Object URL, Base64 URL.*
* **Blazing Fast**.
<br> *Like really fast. Like 1-2ms fast.*
* **Doesn't read whole file**.
<br> *Only reads first few bytes instead of the whole file.*
* **Configurable small builds**.
<br> *Comes in many variants so you import only the code you really need.*
* **Fine grained parsing**
<br> *Only need GPS coords? It'll only parse GPS IFD, not the whole TIFF segment.*
* **Comes as both UMD & ESM Module**
<br> *No need to bundle or browserify. Just `import`, `require()` or `<script>` it in your .mjs, .js or .html file.*
* **Simple output, translated values**
<br> *Meaningful strings instead of enum values, Date instances, converted GPS cords, etc...*
* **Promise based**
* **No dependencies**

### Supports

* .jpg & .tif files
* JFIF, TIFF segments
* XMP - Additional software/photoshop related data. Returned as a string (exifr does not include XML parser).
* IPTC - Captions & copyrights
* ICC Color profile
* Embedded thumbnail extraction

## Installation

```
npm install exifr
```

You can pick and choose from various builds - `full`, `lite`, `mini`, `core`. For browsers we recommend `mini` or `lite` because of balance between features and file size.

```js
// node.js, uses full build by default
import * as exifr from 'exifr'

// modern browser
import * as exifr from 'node_modules/exifr/dist/lite.esm.js'
```

Also availabe as UMD bundle which exports everything as `window.exifr`. Transpiled to ES5, compatible with RequireJS and CJS (Node `require()`). 

```html
<script src="https://unpkg.com/exifr/dist/mini.umd.js"></script>
```
```js
var exifr = require('exifr/dist/full.umd.js')
```

## Usage

`file` can be any kind of buffer/binary format, `<img>` element, string path or url.

* `exifr.parse(file[, options])` => `object`
* `exifr.gps(file)` => `object` `{latitude, longitude}`
* `exifr.thumbnail(file)` => `Uint8Array`
* `exifr.thumbnailUrl(file)` => `string` object url. Browser only.

## Examples

ESM in modern Node.js

```js
import * as exifr from 'exifr'
// exifr reads the file from disk, only a few hundred bytes.
exifr.parse('./myimage.jpg')
  .then(output => console.log('Camera:', output.Make, output.Model))
// Or read the file on your own and feed the buffer into exifr.
fs.readFile('./myimage.jpg')
  .then(exifr.parse)
  .then(output => console.log('Camera:', output.Make, output.Model))
```

UMD in old Node.js

```js
var exifr = require('exifr/dist/full.umd.js')
exifr.gps('./myimage.jpg').then(pos => console.log(pos.latitude, pos.longitude))
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

Extracting thumbnail

```js
let thumbBuffer = await exifr.thumbnail(file)
// or get object URL
img.src = await exifr.thumbnailUrl(file)
```

Usage in WebWorker

```js
// main.js
let worker = new Worker('./worker.js')
worker.postMessage('../test/IMG_20180725_163423.jpg')
worker.onmessage = e => console.log(e.data)
```

```js
// worker.js
importScripts('./node_modules/exifr/dist/mini.umd.js')
self.onmessage = async e => postMessage(await exifr.parse(e.data))
```


## API

exifr exports `parse`, `gps`, `thumbnail`, `thumbnailUrl` functions and `Exifr` class

### `parse(input[, options])` => `Promise<object>`

Accepts file (in any format), parses it and returns exif object.

### `gps(input)` => `Promise<object>`

Extracts only GPS coordinates from photo.

*Uses `pick`/`skip` filters and perf improvements to only extract latitude and longitude tags from GPS block. And to get GPS-IFD pointer it only scans through IFD0 without reading any other unrelated data.*

Check out [examples/gps.js](examples/gps.js) to learn more.

### `thumbnail(input)` => `Promise<Buffer|ArrayBuffer>`

Extracts embedded thumbnail from the photo, returns `Uint8Array`.

*Only parses as little EXIF as necessary to find offset of the thumbnail.

Check out [examples/thumbnail.html](examples/thumbnail.html) and [examples/thumbnail.js](examples/thumbnail.js) to learn more.*

### `thumbnailUrl(input)` => `Promise<string>`, browser only

Exports the thumbnail wrapped in Object URL.

User should to revoke the URL when not needed anymore. [More info here](https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications#Example_Using_object_URLs_to_display_images)

### `Exifr` class

Afore mentioned functions are wrappers that internally:
1) instantiate `new Exifr(options)` class
2) call `.read(input)` to read the file
3) call `.parse()` or `.extractThumbnail()`

To both parse EXIF and extract thumbnail efficiently in one go you can use this class yourself.

*In Node.js it's also necessary to close the file with `.file.close()` if it's read in chunked mode.*

```js
let exr = new Exifr(options)
let output = await exr.read(input)
let buffer = await exr.extractThumbnail()
if (exr.file.chunked) await exr.file.close()
```

### file `input` argument

can be:

* `string` file path
* `string` URL
* `string` Base64
* `string` Object URL / Blob URL
* `Buffer`
* `ArrayBuffer`
* `Uint8Array`
* `DataView`
* `File`
* `Blob`
* `<img>` element

### `options` argument, optional

can be either:
* `true` shortcut to parse all segments and blocks
* `object` with granular settings

#### Segments & Blocks

Jpeg stores various formats of data in structuctures called APP Segments. Heic and Tiff file formats use different naming conventions but here we keep referring to TIFF, XMP, IPTC, ICC and JFIF as Segments.

TIFF Segment consists of various IFD's (Image File Directories) aka blocks.

*EXIF became synonymous for all metadata within image file but it's actually just one of many blocks inside TIFF segment.*

##### APP Segments

* `options.tiff` `<bool|object|Array>` default: `true`
<br>TIFF APP1 Segment - Basic TIFF/EXIF tags, consists of image, exif, gps blocks
* `options.jfif` `<bool>` default: `false`
<br>JFIF APP0 Segment - Additional info
* `options.xmp` `<bool>` default: `false`
<br>XMP APP1 Segment - additional XML data
* `options.iptc` `<bool>` default: `false`
<br>IPTC APP13 Segment - Captions and copyrights
* `options.icc` `<bool>` default: `false`
<br>ICC APP2 Segment - Color profile

##### TIFF IFD Blocks

* `options.ifd0` `<bool|object|Array>` default: `true`
<br>IFD0 IFD - Basic info about photo
* `options.exif` `<bool|object|Array>` default: `true`
<br>EXIF IFD - Detailed info about photo
* `options.gps` `<bool|object|Array>` default: `true`
<br>GPS IFD - GPS coordinates
* `options.thumbnail` `<bool|object|Array>` default: `false`
<br>IFD1 IFD - Info about embedded thumbnail
* `options.interop` `<bool|object|Array>` default: `false`
<br>Interop IFD - Interoperability info

##### Notable TIFF tags

Notably large tags from EXIF block that are not parsed by default but can be enabed if needed.

* `options.makerNote` `<bool>` default: `false`
<br>0x927C MakerNote tag 
* `options.userComment` `<bool>` default: `false`
<br>0x9286 UserComment tag

##### TIFF Scoping options

Each TIFF block (`ifd0`, `exif`, `gps`, `interop`, `thumbnail`) or the whole `tiff` segment can be set to:
* `true` - enabled with default or inherited options.
* `false` - disabled, not parsing
* `object` - enabled with custom options 
   * Subset of `options` object.
   * Can locally override `pick`, `skip` [filters](#tag-filters).
   * Can locally override `translateKeys`, `translateValues`, `reviveValues`, `sanitize` formatters. TODO LINK
   * Defined properties override global `options` values.
   * Undefined properties are inherited from `options` object.
* `Array` - enabled, but only extracts tags from this array
   * List of the only tags to parse. All others are skipped. TODO LINK
   * Sortcut for `{pick: ['tags', ...]}`
   * Can contain both string names and number codes (i.e. `'Make'` or `0x010f`)

TIFF blocks automatically inherit TIFF segment settings (from `options.tiff`) as well as global settings (from `options`) unless 

`options.tiff = false` automatically disables all TIFF blocks - sets them to false as well.

`options.tiff = true` does not automatically enable all TIFF blocks. Only `ifd0`, `exif` and `gps` are enabled by default.

##### Examples

Only extracting FNumber + ISO tags from EXIF and GPSLatitude + GPSLongitude from GPS

```js
// Explicitly specified
let options = {
  exif: {
    pick: ['FNumber', 'ISO']
  },
  gps: ['GPSLatitude', 0x0004], // 0x0004 is GPSLongitude
}

// Shortcut of same
let options = {
  exif: true,
  gps: true,
  pick: ['FNumber', 'ISO', 'GPSLatitude', 0x0004]
}
```

Reviving values (like date string to `Date` instance) globally or scoped.

```js
// Do not revive any values
let options = {
  reviveValues: false,
  exif: {
    // inherits global `reviveValues: false`
  }
}

// Do not revive any values except for those in EXIF block
let options = {
  reviveValues: false,
  exif: {
    reviveValues: true
  }
}
```

### Tag filters

#### `options.pick` `Array<string|number>`

Todo text

#### `options.skip` `Array<string|number>`

Todo text

By default it contains [MakerNote and UserComment tags](#notable-tiff-tags).

### Output format

#### `options.mergeOutput` default: `true`

Merging all parsed segments and blocks into a single object.

**Warning**: `mergeOutput: false` should not be used with `translateKeys: false` or when parsing both `ifd0` and `thumbnail`. Keys are numeric, starting at 0 and they would collide.

##### Example

<table><tr>
<td>mergeOutput: false</td>
<td>mergeOutput: true</td>
</tr><tr><td><pre>
{
  Make: 'Google',
  Model: 'Pixel',
  FNumber: 2,
  ISO: 50,
  City: 'Vsetín',
  Country: 'Czech Republic',
  xmp: '&lt;x:xmpmeta ...&gt;&lt;rdf:Description ...'
}
</pre></td><td><pre>
{
  ifd0: {
    Make: 'Google',
    Model: 'Pixel'
  },
  exif: {
    FNumber: 2,
    ISO: 50
  },
  iptc: {
    City: 'Vsetín',
    Country: 'Czech Republic'
  }
  xmp: '&lt;x:xmpmeta ...&gt;&lt;rdf:Description ...'
}
</pre></td></tr></table>

#### `options.translateKeys` default: `true`

Translate tag keys from numeric codes to understandable string names. I.e. uses `Model` instead of `0x0110`.

TODO info about dictionaries + link

**Warning**: `translateKeys: false` should not be used with `mergeOutput: false`. Keys may collide because ICC, IPTC and TIFF segments use numeric keys starting at 0.

Tags are numeric, sometimes refered to in hex notation. To access the `output.ifd0.Make` tag use `output.ifd0[0x010f]` or `output.ifd0[271]`

<table><tr>
<td>translateKeys: false</td>
<td>translateKeys: true</td>
</tr><tr><td><pre>{
  ifd0: {
    0x0110: 'Pixel'
  },
  iptc: {
    90: 'Vsetín',
  },
  icc: {
    64: 'Perceptual',
    desc: 'sRGB IEC61966-2.1',
  }
}</pre></td><td><pre>{
  ifd0: {
    Model: 'Pixel',
  },
  iptc: {
    City: 'Vsetín',
  },
  icc: {
    RenderingIntent: 'Perceptual',
    ProfileDescription: 'sRGB IEC61966-2.1',
  }
}</pre></td></tr></table>

#### `options.translateValues` default: `true`

Translate tag values from their raw enum values to understandable strings.

Todo info about dict

TODO: update coode

<table><tr>
<td>translateValues: false</td>
<td>translateValues: true</td>
</tr><tr><td><pre>
{
  Orientation: 1,
  ResolutionUnit: 2,
  Flash: 16,
  RenderingIntent: 0,
}
</pre></td><td><pre>
{
  Orientation: 'Horizontal (normal)',
  ResolutionUnit: 'inches',
  Flash: 'Flash did not fire, compulsory flash mode',
  RenderingIntent: 'Perceptual',
}
</pre></td></tr></table>

#### `options.reviveValues` default: `true`
Converts dates to Date instances and raw `Uint8Array` data to more readable format.

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

### Chunked reader

TODO: update

If enabled, exifr makes an guess on whether to read the file or just chunks of it, based on typical file structure, your file type and segments you want to parse.
This can save lots of memory, disk reads and speed things up. But it may not suit you.

* `options.wholeFile` `bool/undefined` default `undefined`

**Chunked mode** - In browser it's sometimes better to fetch a larger chunk in hope that it contains the whole EXIF (and not just its beginning like in case of `options.seekChunkSize`) in prevention of additional loading and fetching. `options.parseChunkSize` sets that number of bytes to download at once. Node.js only relies on the `options.seekChunkSize`.

**Whole file mode** - If you're not concerned about performance and time (mostly in Node.js) you can tell `exifr` to just read the whole file into memory at once.`

TODO: update

#### `options.wholeFile` `bool/undefined` default `undefined`
<br>Sets whether to read the file as a whole or just by small chunks.
<br>*Used when file path or url to the image is given.*
  * `true` - whole file mode
  <br>forces fetching/reading whole file
  * `undefined` - chunked mode, **default value**
  <br>Reads first few bytes of the file to look for EXIF in (`seekChunkSize`) and allows reading/fetching additional chunks.
  <br>Ends up with multiple small disk reads for each segment (xmp, icc, iptc)
  <br>*NOTE: Very efficient in Node.js, especially with SSD. Not ideal for browsers*
  * `false` - chunked mode
  <br>Reads only one much larger chunk (`parseChunkSize`) in hopes that the EXIF isn't larger then the chunk.
  <br>Disallows further disk reads. i.e. ignores any EXIF found beyond the chunk.

TODO: update

#### `options.seekChunkSize` `number` default: `512` Bytes (0.5 KB)
Byte size of the first chunk that will be read and parsed for EXIF.
*EXIF is usually within the first few bytes of the file. If not than there likely is no EXIF. It's not necessary to read through the whole file.*
Node.js: Used for all input types.
Browser: Used when input `arg` is buffer. Otherwise, `parseChunkSize` is used.

TODO: update

#### `options.parseChunkSize` `number` default: `64 * 1024` (64KB)
Size of the chunk to fetch in the browser in chunked mode.
*Much like `seekChunkSize` but used in the browser (and only if we're given URL) where subsequent chunk fetching is more expensive than fetching one larger chunk with hope that it contains the EXIF.*
Node.js: Not used.
Browser: Used when input `arg` is string URL. Otherwise, `seekChunkSize` is used.

TODO: update

If parsing file known to have EXIF fails try:
* Increasing `seekChunkSize`
* Increasing `parseChunkSize` in the browser if file URL is used as input.
* Disabling chunked mode (read whole file)

## Modular distributions

Exifr is modular so you can pick and choose from many builds and prevent downloading unused code. It's a good idea to start development with full version and then scale down to a lighter build of exifr with just the bare minimum of functionality, parsers and dictionary your app needs.

### Parsers

* TIFF
  * IFD0 aka image
  * EXIF
  * GPS
  * Interop
* XMP
* ICC
* IPTC

### Dictionaries

TODO

JFIF
https://exiftool.org/TagNames/JFIF.html

TIFF (EXIF, GPS)
https://exiftool.org/TagNames/EXIF.html
https://exiftool.org/TagNames/GPS.html

ICC
https://exiftool.org/TagNames/ICC_Profile.html

IPTC
https://exiftool.org/TagNames/IPTC.html

Exif stores data as numerical tags and enums. To translate them into meaningful output we need dictionaries.
Dictionaries take a good portion of the exifr's size. But you may not even need most of it.
Tag dictionaries 

<table><tr><td>
Raw
</td><td>
Translated tags
</td><td>
Translated values
</td><td>
Fully translated
</td></tr><tr><td><pre>
{42: 1}
</pre></td><td><pre>
{Sharpness: 1}
</pre></td><td><pre>
{42: 'Strong'}
</pre></td><td><pre>
{Sharpness: 'Strong'}
</pre></td></tr></table>

## Distributions

Need to cut down on file size? Try using lite build. Suitable when you only need certain tags (such as gps coords) and looking up the tag codes yourself is worth saving some Kbs.

Need to support older browsers? Use legacy build along with polyfills.

### By size

* **Default** (with tag dictionary)
<br>Includes both parser and the tag dictionary (additional ~16 Kb).
<br>Values are accessed by tag name: `output.exif.ExposureTime`
* **Lite**
<br>Only includes parser. Tags are not translated using dictionary.
<br>Values are accessed by tag code: `output.exif[0x829A]`

### By module / bundle

* **ESM**
<br>The new ES Module using the new syntax `import {parse} from 'exifr'`
* **UMD**
<br>The classic javascript that can be used with AMD (RequireJS), CJS (Node.js `require()`), or simply `<script>`ed in browsers.

### By supported target

* **Modern**
<br>Supports latest few versions of not dead browsers.
<br>Uses new syntax and features like classes and async/await.
<br>The output is lightweight, without any polyfills.
* **Legacy**
<br>Supports older browsers including IE 11.
<br>Code is transpiled with babel and includes babel's polyfills (for ES6 classes and async/await) which makes it about 2x the size of modern build.
<br>You still need to provide polyfill for Array.from, Set, TextEncoder, Object.entries and other ES6+ features

### ~~By included parsers~~

TODO: to be implemented

### Distributions chart

| Distributions                        | Modern ESM module | Modern UMD bundle | Legacy UMD bundle       |
|--------------------------------------|-------------------|-------------------|-------------------------|
| **Full** *(with tags dictionary)*    | `index.mjs`       | `index.js`        | `index.legacy.js`       |
| **Lite** *(without tags dictionary)* | `lite.mjs`        | `lite.js`         | `lite.legacy.js`        |

### Examples

```js
import {parse} from './node_modules/exifr/index.mjs'
```
```html
<script src="./node_modules/exifr/index.legacy.js"></script>
```
```js
require('exifr') // imports index.js
```
```js
require('exifr/index.legacy.js') // imports index.legacy.js
```

TODO - work in progress

|                 | full | lite | mini | core |
|-----------------|------|------|------|------|
| chunked reader  | yes  | yes  | no   | no   |
| inputs          | `ArrayBuffer`<br>`Buffer`<br>`Uint8Array`<br>`DataView`<br>`Blob`/`File`<br>url string<br>path string<br>base64 string or url | `ArrayBuffer`<br>`Buffer`<br>`Uint8Array`<br>`DataView`<br>`Blob`/`File`<br>url string<br>path string | `ArrayBuffer`<br>`Buffer`<br>`Uint8Array`<br>`DataView`<br>`Blob`/`File`<br>url string | `ArrayBuffer`<br>`Buffer`<br>`Uint8Array`<br>`DataView`<br>`Blob`/`File`<br>url string |
| file readers    | BlobReader<br>UrlFetcher<br>FsReader<br>Base64Reader | BlobReader<br>UrlFetcher | none | none |
| file parsers    | `*.jpg`<br>`*.heic`<br>`*.tif` | `*.jpg`<br>`*.heic` | `*.jpg` | none |
| segment parsers | TIFF (EXIF) + less frequent tags<br>IPTC<br>XMP<br>ICC<br>JFIF | TIFF (EXIF)<br>IPTC<br>XMP | TIFF (EXIF) | none |
| dictionaries    | ... | ... | ... | none |
| size            | 40 Kb | 30 Kb | 20 Kb | 10 Kb |
| file            | `dist/full.esm.js`<br>`dist/full.umd.js` | `dist/lite.esm.js`<br>`dist/lite.umd.js` | `dist/mini.esm.js`<br>`dist/mini.umd.js` | `dist/core.esm.js`<br>`dist/core.umd.js` |

**full** - Contains everything - all readers, parsers, dictionaries. Intended for use in Node.js.
**lite** - like `mini` + support for modern `.heic` (iPhone) photos, IPTC parser (photo description and author) XMP parser (panorama & tech details)
**mini** - Stripped down to basics, as lightweight as it can get. fetches whole file and realiably parses most useful info from jpegs.
**core** - Build your own

Of course you can use `full` version in browser, or use any other builds in Node.js. Either to save memory, or to build your own exifr with `core` and hand picking parsers you need.

## Usage with Webpack, Parcel, Rollup and other bundlers.

Out of the box the library comes in:
1) **index.mjs** - the modern **ES Module** format
<br>*Not bundled, index.mjs further imports few other files from src/ folder*
<br>*You may want to bundle & treeshake this yourself*
2) **index.js** - **UMD bundle** which
<br>*combines the classic Node.js CommonJS `require('exifr')` with AMD/Require.js as well as browser-friendly `<script src="node_modules/exifrdist/mini.esmx.js">`*
<br>*All in one file*
<br>*Prebundled with Rollup*

Under the hood `exifr` dynamically imports Node.js `fs` module, but only ran under Node.js. The import is obviously not triggered in browser. Your bundler may however pick up on it and fail with something like `Error: Can't resolve 'fs'`.

Parcel works out of the box and Webpack should too because we added the ignore magic comment to the library's source code `import(/* webpackIgnore: true */ 'fs')`.

If this does not work for you, try adding `node: {fs: 'empty'}` and `target: 'web'` or `target: 'webworker'` to your Webpack config.

Or try adding similar settings to your bundler of choice.

## Notable breaking changes / Migration from 2.x.x to 3.0.0

Complete list of breaking changes is in [`CHANGELOG.md`][changelog]

1) Changed EXIF & IPTC tag dictionary to match [ExifTool](https://exiftool.org/TagNames/EXIF.html). Most tags should stay the same, but expect some changed. For example:
<br>before `{ExposureBiasValue: 0}`, after `{ExposureCompensation: 0}`
<br>before `{WhiteBalance: 'Auto white balance'}`, after `{WhiteBalance: 'Auto'}`
2) Renamed `ExifParser` class to `Exifr`.
3) Renamed `thumbnailBuffer` to `thumbnail`

```js
// 2.x.x
import * as exifr from 'exifr'
exifr.thumbnailBuffer()
// 3.0.0
import * as exifr from 'exifr'
exifr.thumbnail()
```

## XMP

Exifr does not come with an XML parser out of the box, because those are heavy, complicated. And there's plenty of them on npm already.
So to keep exifr simple and light-weight, it only extract the XMP string and you have to parse it yourself.

You can also inject XML parser into exifr and have it process the XMP string.

```js
// Exifr offers you an API for using your own XML parser while parsing XMP.
// 1) get the XmlParser class.
let XmpParser = Exifr.segmentParsers.get('xmp')
// 2) Implement parseXml() method which takes one string argument
//    and returns anything that ends up as output.xmp.
XmpParser.prototype.parseXml = function(xmpString) {
	return 'Bring Your Own XML parser here: ' + xmpString
}
```

## Note on performance

As you've already read, this lib was built to be fast. Fast enough to handle whole galleries.

We're able to parse image within a couple of milliseconds (tens of millis on phones) thanks to selective disk reads (Node.js) and Blob / ArrayBuffer (Browser) manipulations. Because you don't need to read the whole file and parse through a MBs of data if we an educated guess can be made to only read a couple of small chunks where EXIF usually is. Plus each supported data type is approached differently to ensure the best performance.

Observations from testing with +-4MB pictures (*Highest quality, highest resolution Google Pixel photos, tested on a decade old quad core CPU*). Note: These are no scientific measurements.

* Node: Selective disk reads take about 1ms.
* Node: Processing fully buffered data take about 2.5ms on average.
* Browser: ArrayBuffer takes about 2ms
* Browser: Blob can go up to 10ms on average.
* Browser: \<img> with Object URL as a src varies between 5ms to 30ms
* Drag-n-dropping gallery of 90 images took 160ms to load, parse and create exif objects. Extracting GPS data and logging it to console took another 60ms (220ms all together).
* Phones are significantly slower. Usually 40-150ms per photo. This is seriously impacted by loading the photo into browser, not so much of a parsing problem. But real-world photo-to-exif time can be as slow as 150ms.

### HEIC

Other libraries use brute force to read through all bytes until 'Exif' string is found. Whereas exifr recognizes the file structure which consists of nested boxes. This allows exifr to read just a few bytes here and there, to get sizes of the box and pointers to jump to next.

Simply finding the exif offset takes 0.2-0.3ms with exifr. Compare that to [https://github.com/exif-heic-js/exif-heic-js](https://github.com/exif-heic-js/exif-heic-js) which takes about 5-10ms on average. That's up to 30x faster.

## Licence

MIT, Mike Kovařík, Mutiny.cz

<!-- links -->

[changelog]: https://github.com/mozilla/learning.mozilla.org/blob/master/CHANGELOG.md
