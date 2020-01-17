<p align="center">
	<img src="https://raw.githubusercontent.com/MikeKovarik/exifr/next-major-rewrite/logo/blue-small.png" width="200" alt="exifr">
</p>

<p align="center">
📷 The fastest and most versatile JavaScript EXIF reading library.
</p>

<p align="center">
	<a href="https://travis-ci.org/MikeKovarik/exifr"><img src="https://travis-ci.org/MikeKovarik/exifr.svg?branch=master" alt="Build Status"></a>
	<a href="https://npmjs.org/package/exifr"><img src="https://img.shields.io/npm/v/exifr.svg?style=flat" alt="NPM Version"></a>
	<a href="https://david-dm.org/MikeKovarik/exifr"><img src="https://david-dm.org/MikeKovarik/exifr.svg" alt="Dependency Status"></a>
	<a href="https://david-dm.org/MikeKovarik/exifr#info=devDependencies"><img src="https://david-dm.org/MikeKovarik/exifr/dev-status.svg" alt="devDependency Status"></a>
	<a href="https://coveralls.io/github/MikeKovarik/exifr"><img src="https://coveralls.io/repos/github/MikeKovarik/exifr/badge.svg" alt="Coverage Status"></a>
	<a href="https://github.com/MikeKovarik/exifr/blob/master/LICENSE"><img src="http://img.shields.io/npm/l/exifr.svg?style=flat" alt="License"></a>
</p>

<p align="center">
Try it yourself - <a href="https://mutiny.cz/exifr/">demo page & playground</a>
</p>

## Installation

```
npm install exifr
```

also availabe as UMD bundle transpiled for ES5

```
https://unpkg.com/exifr
```

## Features

Works everywhere and accepts pretty much everything you throw at it.

* **Isomorphic**.
<br> *Works in both Node and Browsers.*
* **Wide range of inputs**
<br> *`ArrayBuffer`, `Uint8Array`, `DataView`, `<img>` elements, string URL and paths, Object URL, Base64 URL*
* **Blazing Fast**.
<br> *Like really fast. Like 1-2ms fast.*
* **Efficient**.
<br> *Only reads first few bytes of the file.*
* Fine grained parsing
<br> *only need GPS coords? No need to parse the whole exif*
* Promise based
<br> *Uses Node.js 10.x experimental Promise FS API*
* Comes as UMD module (along with ESM source).
<br> *No need to bundle or browserify. Just `import`, `require()` or `<script>` it in your .mjs, .js or .html file.*
* Simple output
<br> *meaningful descriptive strings instead of enum values, dates converted to Date instances, etc...*
* **No dependencies**

### Supports

* Basic TIFF/EXIF support
* XMP Segments - Additional software/photoshop related data. Returned as a string (exifr does not include XML parser).
* IPTC Segments - Captions & copyrights
* Embedded thumbnail extraction

## Usage

ESM in Node.js

```js
import * as exifr from 'exifr'
// exifr handles disk reading. Only reads a few hundred bytes.
exifr.parse('./myimage.jpg')
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
  // UMD module exposed on global window.exifr object
  exifr.parse(document.querySelector('img'))
    .then(exif => console.log('Exposure:', exif.ExposureTime))
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
let thumbBuffer = await exifr.thumbnailBuffer(imageBuffer)
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
let exifr = self.exifr // UMD
self.onmessage = async e => postMessage(await exifr.parse(e.data))
```

## API

exifr exports `parse`, `thumbnailBuffer`, `thumbnailUrl` functions and `ExifParser` class

### `parse(input[, options])` => `Promise<object>`

Accepts any input argument, parses it and returns exif object.

### `thumbnailBuffer(input)` => `Promise<Buffer|ArrayBuffer>`

Extracts embedded thumbnail from the photo and returns it as a `Buffer` (Node.JS) or an `ArrayBuffer` (browser). 

Only parses as little EXIF as necessary to find offset of the thumbnail.

### `thumbnailUrl(input)` => `Promise<string>`

Browser only - exports the thumbnail wrapped in Object URL.

User is expected to revoke the URL when not needed anymore.

### `ExifParser` class

Afore mentioned functions are wrappers that internally instantiate `new ExifParse(options)` class, then call `parser.read(input)`, and finally call either `parser.parse()` or `parser.extractThumbnail()`.

To do both parsing EXIF and extracting thumbnail efficiently you can use this class yourself.

```js
let parser = new ExifParser(options)
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

#### Segments & Blocks

* `options.tiff: true` - APP1 - TIFF
<br>The basic EXIF tags (image, exif, gps)
<br>TIFF contains the following blocks / is requred for reading the following block:
  * `options.exif: true` - Sub Exif.
  * `options.gps: true` - GPS latitue and longitude data.
  * `options.thumbnail: false` - Size and other information about embedded thumbnail.
  * `options.interop: false` - This is a thing too.
* `options.xmp: false` - APP1 - XMP
<br>XML based extension, often used by editors like Photoshop.
* ~~`options.icc: false` - APP2 - ICC~~
<br>~~Not implemented yet~~
* `options.iptc: false` - APP13 - IPTC
<br>Captions and copyrights

#### Output format

* `options.postProcess` `number` default: `true`
<br>Translate enum values to strings, convert dates to Date instances, etc...

* `options.mergeOutput` `number` default: `true`
<br>Changes output format by merging all segments and blocks into a single object.

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

## Next version
The library is already production ready and battle-tested, but there's always room for improvement.

Version 3.0.0 is currently underway and developed on a branch [next-major-rewrite](https://github.com/MikeKovarik/exifr/tree/next-major-rewrite). It is a complete rewrite with focus on modularization and even better performance and stability.

## Licence

MIT, Mike Kovařík, Mutiny.cz
