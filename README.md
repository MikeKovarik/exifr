<img src="https://raw.githubusercontent.com/MikeKovarik/exifr/next-major-rewrite/logo/blue-small.png" width="140" alt="exifr">

[![Build Status](https://travis-ci.org/MikeKovarik/exifr.svg?branch=master)](https://travis-ci.org/MikeKovarik/exifr)
[![NPM Version](https://img.shields.io/npm/v/exifr.svg?style=flat)](https://npmjs.org/package/exifr)
[![Dependency Status](https://david-dm.org/MikeKovarik/exifr.svg)](https://david-dm.org/MikeKovarik/exifr)
[![devDependency Status](https://david-dm.org/MikeKovarik/exifr/dev-status.svg)](https://david-dm.org/MikeKovarik/exifr#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/github/MikeKovarik/exifr/badge.svg)](https://coveralls.io/github/MikeKovarik/exifr)
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

also availabe as UMD bundle transpiled for ES5

```
https://unpkg.com/exifr
```

## Usage

* `parse(Buffer[, options])` Node.js only
* `parse(ArrayBuffer[, options])`
* `parse(Uint8Array[, options])`
* `parse(DataView[, options])`
* `parse(urlString[, options])` Browser only
* `parse(objectUrlString[, options])` Browser only
* `parse(filePathString[, options])` Node.js only
* `parse(base64String[, options])`
* `parse(HTMLImageElement[, options])` Browser only
* `parse(File[, options])` Browser only
* `parse(Blob[, options])` Browser only
* `extractThumbnail(Blob)`

## Examples

ESM in Node.js

```js
import Exifr from 'exifr'
// exifr handles disk reading. Only reads a few hundred bytes.
Exifr.parse('./myimage.jpg')
  .then(exif => console.log('Camera:', exif.Make, exif.Model))
  .catch(console.error)
```

CJS in Node.js

```js
let exifr = require('exifr')
let fs = require('fs').promises
// Or read the file on your own and feed the buffer into exifr.
fs.readFile('./myimage.jpg')
  .then(exifr.parse)
  .then(exif => console.log('lat lon', exif.latitude, exif.longitude))
  .catch(console.error)
```


UMD in Browser

```html
<img src="./myimage.jpg">
<script src="./node_modules/exifr/index.js"></script>
<script>
  // UMD module exposed as window.exifr
  let img = document.querySelector('img')
  exifr.parse(img).then(exif => console.log('Exposure:', exif.ExposureTime))
</script>
```

ESM in Browser

```html
<input id="filepicker" type="file" multiple>
<script type="module">
  import {parse} from './node_modules/exifr/index.js'

  document.querySelector('#filepicker').addEventListener('change', async e => {
    let files = Array.from(e.target.files)
    let promises = files.map(parse)
    let exifs = await Promise.all(promises)
    let dates = exifs.map(exif => exif.DateTimeOriginal.toGMTString())
    console.log(`${files.length} photos taken on:`, dates)
  })
</script>
```

Extracting thumbnail

```js
let img = document.querySelector("#thumb")
document.querySelector('input[type="file"]').addEventListener('change', async e => {
  let file = e.target.files[0]
  img.src = await exifr.thumbnailUrl(file)
})
```

```js
let thumbBuffer = await exifr.thumbnail(imageBuffer)
```

Usage in WebWorker

```js
let worker = new Worker('./worker.js')
worker.postMessage('../test/IMG_20180725_163423.jpg')
worker.onmessage = e => console.log(e.data)
```

```js
// worker.js
importScripts('./node_modules/exifr/index.js')
self.onmessage = async e => postMessage(await exifr.parse(e.data))
```


## API

exifr exports `parse`, `thumbnail`, `thumbnailUrl` functions and `Exifr` class

### `parse(input[, options])` => `Promise<object>`

Accepts any input argument, parses it and returns exif object.

### `thumbnail(input)` => `Promise<Buffer|ArrayBuffer>`

Extracts embedded thumbnail from the photo and returns it as a `Buffer` (Node.JS) or an `ArrayBuffer` (browser). 

Only parses as little EXIF as necessary to find offset of the thumbnail.

### `thumbnailUrl(input)` => `Promise<string>`

Browser only - exports the thumbnail wrapped in Object URL.

User is expected to revoke the URL when not needed anymore.

### `Exifr` class

Afore mentioned functions are wrappers that internally instantiate `new ExifParse(options)` class, then call `parser.read(input)`, and finally call either `parser.parse()` or `parser.extractThumbnail()`.

To do both parsing EXIF and extracting thumbnail efficiently you can use this class yourself.

```js
let parser = new Exifr(options)
let exif = await parser.read(input)
let thumb = await parser.extractThumbnail()
```

### Arguments and options

#### `input`
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

#### `options`
 is optional argument and can be either:
* `object` with granular settings
* `boolean` shortcut to enable parsing all segments and blocks

#### Reading file from disk or fetching url

If allowed, exifr makes an guess on whether to read the file or just chunks of it, based on typical file structure, your file type and segments you want to parse.
This can save lots of memory, disk reads and speed things up. But it may not suit you.

* `options.wholeFile` `bool/undefined` default `undefined`

##### Chunked mode

In browser it's sometimes better to fetch a larger chunk in hope that it contains the whole EXIF (and not just its beginning like in case of `options.seekChunkSize`) in prevention of additional loading and fetching. `options.parseChunkSize` sets that number of bytes to download at once. Node.js only relies on the `options.seekChunkSize`.

##### Whole file mode

If you're not concerned about performance and time (mostly in Node.js) you can tell `exifr` to just read the whole file into memory at once.`

* `options.wholeFile` `bool/undefined` default `undefined`
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

* `options.seekChunkSize` `number` default: `512` Bytes (0.5 KB)
<br>Byte size of the first chunk that will be read and parsed for EXIF.
<br>*EXIF is usually within the first few bytes of the file. If not than there likely is no EXIF. It's not necessary to read through the whole file.*
<br>Node.js: Used for all input types.
<br>Browser: Used when input `arg` is buffer. Otherwise, `parseChunkSize` is used.

* `options.parseChunkSize` `number` default: `64 * 1024` (64KB)
<br>Size of the chunk to fetch in the browser in chunked mode.
<br>*Much like `seekChunkSize` but used in the browser (and only if we're given URL) where subsequent chunk fetching is more expensive than fetching one larger chunk with hope that it contains the EXIF.*
<br>Node.js: Not used.
<br>Browser: Used when input `arg` is string URL. Otherwise, `seekChunkSize` is used.

If parsing file known to have EXIF fails try:
* Increasing `seekChunkSize`
* Increasing `parseChunkSize` in the browser if file URL is used as input.
* Disabling chunked mode (read whole file)

#### APP Segments & IFD Blocks

* `options.tiff: true` - APP1 - TIFF
<br>The basic EXIF tags (image, exif, gps)
<br>TIFF segment contains the following blocks / is requred for reading the following block:
  * `options.ifd0: true` - Basic info about photo.
  * `options.exif: true` - More detailed info about photo.
  * `options.gps: true` - GPS latitue and longitude data.
  * `options.thumbnail: false` - Size and basic info about embedded thumbnail.
  * `options.interop: false` - This is a thing too.
* `options.xmp: false` - APP1 - XMP
<br>XML based extension, often used by editors like Photoshop.
* `options.iptc: false` - APP13 - IPTC
<br>Captions and copyrights
* `options.icc: false` - APP2 - ICC
<br>Color profile

Each Segment (`tiff`, `xmp`, `iptc`, `icc`) and TIFF block (`ifd0`, `exif`, `gps`, `interop`, `thumbnail`) can be set to either:
* `true` - enabled with default or inherited options.
* `false` - disabled, not parsing
* `object` - enabled with custom options 
   * Subset of `options` object.
   * Defined properties override values from `options` object.
   * Undefined properties are inherited from `options` object.
   * Can contain `pick`, `skip`, `translateKeys`, `translateValues`, `reviveValues`, `sanitize`
* `Array` of tag names or codes - disabled, not parsing
   * List of the only tags to parse. All others are skipped.
   * It's a sortcut for `{pick: ['tags', ...]}`
   * Can contain both string names and number codes (i.e. `'Make'` or `0x010f`)

All settings for `options.tiff` are automatically inherited by TIFF blocks (`ifd0`, `exif`, `gps`, `interop`, `thumbnail`) unless specified otherwise.

Setting `options.tiff = false` automatically disables all TIFF blocks - sets them to false as well.

However setting `options.tiff = true` does not automatically enables all TIFF blocks. Only `ifd0`, `exif` and `gps` are enabled.  `thumbnail` and `inerop` are left disabled

#### Output format

* `options.postProcess` `number` default: `true`
<br>Translate enum values to strings, convert dates to Date instances, etc...

* `options.mergeOutput` `number` default: `true`
<br>Changes output format by merging all segments and blocks into a single object.

<table><tr><td>
Default
</td><td>
Merged
</td></tr><tr><td><pre>
{
  Make: 'Google',
  Model: 'Pixel',
}
</pre></td><td><pre>
{
  exif: {
    Make: 'Google',
    Model: 'Pixel',
  },
  gps: {
  }
}
</pre></td></tr></table>


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

|         | Supported inputs                                             | Chunked mode | parsers                               | size  |
|---------|--------------------------------------------------------------|--------------|---------------------------------------|-------|
| full    | Buffer, ArrayBuffer, Uint8Array, DataView, Blob, url, base64 |      yes     | TIFF, thumbnail, IPTC, JFIF, ICC, XMP | 50 Kb |
| default | Buffer, ArrayBuffer, Uint8Array, DataView, Blob              |      yes     | TIFF, thumbnail                       | 40 Kb |
| lite    | Buffer, ArrayBuffer, Uint8Array, DataView,                   |      no      | TIFF                                  | 30 Kb |


| | full | lite |
|-|-|-|
| inputs | `ArrayBuffer`<br>`Buffer` | `ArrayBuffer` |
| file readers | BlobReader<br>Base64Reader | BlobReader |
| file parsers | `*.jpg`<br>`*.tif` | `*.jpg`<br>`*.tif` |
| segment parsers | TIFF<br>IPTC<br>ICC | TIFF |
| dictionaries | ... | ... |
| chunked reader | yes | no |
| size | 40 Kb | 20 Kb |
| file | `index.js` | `index2.js` |

## Usage with Webpack, Parcel, Rollup and other bundlers.

Out of the box the library comes in:
1) **index.mjs** - the modern **ES Module** format
<br>*Not bundled, index.mjs further imports few other files from src/ folder*
<br>*You may want to bundle & treeshake this yourself*
2) **index.js** - **UMD bundle** which
<br>*combines the classic Node.js CommonJS `require('exifr')` with AMD/Require.js as well as browser-friendly `<script src="node_modules/exifr/index.js">`*
<br>*All in one file*
<br>*Prebundled with Rollup*

Under the hood `exifr` dynamically imports Node.js `fs` module, but only ran under Node.js. The import is obviously not triggered in browser. Your bundler may however pick up on it and fail with something like `Error: Can't resolve 'fs'`.

Parcel works out of the box and Webpack should too because we added the ignore magic comment to the library's source code `import(/* webpackIgnore: true */ 'fs')`.

If this does not work for you, try adding `node: {fs: 'empty'}` and `target: 'web'` or `target: 'webworker'` to your Webpack config.

Or try adding similar settings to your bundler of choice.

## Breaking changes / Migration from 2.x.x to 3.0.0

Complete list of breaking changes is in [`CHANGELOG.md`][changelog]

1) Named exports are replaced by default export.

```js
// 2.x.x
import {parse, thumbnailBuffer} from 'exifr'
parse()
// or
import * as exifr from 'exifr'
exifr.thumbnailBuffer()
// 3.0.0
import exifr from 'exifr'
exifr.parse()
exifr.thumbnail() // renamed from thumbnailBuffer()
```

2) `ExifParser` is renamed to `Exifr` and became the default export.

```js
// 2.x.x
import {ExifParser} from 'exifr'
// 3.0.0
import Exifr from 'exifr'
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

## Licence

MIT, Mike Kovařík, Mutiny.cz

<!-- links -->

[changelog]: https://github.com/mozilla/learning.mozilla.org/blob/master/CHANGELOG.md