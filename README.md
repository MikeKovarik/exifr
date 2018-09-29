# exifr

📑 The fastest and most versatile JavaScript EXIF reading library.

## Installation

```
npm install exifr
```

## Why? Yet another exif library?

Yes, there are many great exif libraries and modules already out there, some of which served as an inspiration for this one. But they are usually left unmaintained with plenty of open issues and no hope for accepting PRs. Most of them are not isomorphic, have questionable output format and performance, unnecessary dependencies and one even extends prototype of Number and Buffer! But no pointing fingers.

So why exifr?

### Features

* **Isomorphic**. Works in both Node and Browsers. Accepts wide range of inputs: ArrayBuffer, Uint8Array, DataView, <img> elements, string URL and paths, Object URL, Base64 URL
* **Blazing Fast**. Like relly fast. Like 1-2ms fast.
* allows fine grained parsing (*only need GPS coords? No need to parse through kBs of exif)*)
* Promise based (*NOTE: Uses Node.js 10.x experimental Promise FS API*)
* No dependencies. *Not even Node's builtins like Buffer.*
* Comes as UMD module (compiled from ESM). No need to bundle or browserify. Just import, require or \<script\> it in your .mjs, .js or .html file.
* Simple output, meaningful descriptive strings instead of enum values, dates converted to Date instances, etc... (Can be disabled with options.postProcess)
* Written is ES6 as an ES Module.

### Supports

* Basic TIFF/EXIF support
* XMP Segments - Additional software/photoshop related data. Returned as string (exifr does not include XML parser).
* IPTC Segments - Captions & copyrights


## Usage

Works in both Node.js and web browser and accepts pretty much everything you throw at it. Buffer, ArrayBuffer, Uint8Array, string file path, URL, Object URL, Base64 encoded data URL, even \<img\> element.

### Example of usage in Node

```js
import getExif from 'exifr'

getExif('./myimage.jpg')
  .then(exif => console.log('Camera:', exif.Make, exif.Model))
  .catch(console.error)
```

### ESM in Node

```js
var getExif = require('exifr')
var fs = require('fs').promises

fs.readFile('./myimage.jpg')
  .then(getExif)
  .then(exif => {
    console.log('Latitude', exif.GPSLatitude)
    console.log('Longitude', exif.GPSLongitude)
  })
  .catch(console.error)
```

### Example of usage in Browser

```html
// index.html
<script src="./node_modules/exifr/index.js"></script>
<script src="./myapp.js"></script>
<img src="./myimage.jpg">
```

```js
// myapp.js
var getExif = window.exifr // UMD module exposed on global object

getExif(document.querySelector('img'))
  .then(exif => console.log('Exposure:', exif.ExposureTime))
```

### ESM in browser

```html
// index.html
<input id="filepicker" type="file" multiple>
<script type="module" src="./myapp.mjs"></script>
```

```js
// myapp.mjs
import getExif from './node_modules/exifr/index.js'

var picker = document.querySelector('#filepicker')
picker.addEventListener('change', async e => {
  var files = Array.from(picker.files)
  var promises = files.map(getExif)
  var exifs = await Promise.all(promises)
  var dates = exifs.map(exif => exif.DateTimeOriginal.toGMTString())
  console.log(`${files.length} photos taken on:`, dates)
})
```

### Usage in Worker

main.html

```js
var worker = new Worker('./worker.js')
worker.postMessage('../test/IMG_20180725_163423.jpg')
worker.onmessage = e => console.log(e.data)
```


worker.js

```js
importScripts('./node_modules/exifr/index.js')
var getExif = self.exifr // UMD

self.onmessage = async e => postMessage(await getExif(e.data))
```

## API

### `getExif(arg[, options])`

exifr only exports single function (ESM default export). Accepts two arguments.

`arg` can be a string path or URL (even Base64 and Object URL / Blob URL), instance of Buffer, ArrayBuffer, Uint8Array, DataView, File, Blob and \<img> element.

`options` is optional and can be wither object with custom settings, or boolean that enables/disables parsing of all EXIF segments and blocks.

### Default options

```js
{

  // READING & PARSING

  // We're trying not to read the whole file to increate performance but certain
  // segments (IPTC, XMP) require whole file to be buffered and parsed through.
  scanWholeFileForce: false,
  // Only the first 512 Bytes are scanned for EXIF due to performance reasons.
  // Setting this to true enables searching through the whole file.
  scanWholeFileFallback: false,
  // Size of the chunk that can be scanned for EXIF.
  seekChunkSize: 512,
  // In browser its sometimes better to download larger chunk in hope that it contains the
  // whole EXIF (and not just its begining like in case of seekChunkSize) in prevetion
  // of additional loading and fetching.
  parseChunkSize: 64 * 1024,

  // Translate enum values to strings, convert dates to Date instances, etc...
  postProcess: true,
  // Changes output format by merging all segments and blocks into single object.
  // NOTE: Causes loss of thumbnail EXIF data.
  mergeOutput: true,

  // PARSED SEGMENTS

  // TIFF - The basic EXIF tags (image, exif, gps)
  tiff: true,
  // XMP = XML based extension, often used by editors like Photoshop.
  xmp: false,
  // ICC - Not implemented yet
  icc: false,
  // IPTC - Captions and copyrights
  iptc: false,

  // TIFF BLOCKS
  // Sub Exif.
  exif: true,
  // GPS latitue and longtitude data.
  gps: true,
  // Size and other information about embeded thumbnail.
  thumbnail: false,
  // This is a thing too.
  interop: false,

}
```

## Note on performance

As you've already read, this lib was built to be fast. Fast enough to handle whole galleries.

We're able to parse image within couple of milliseconds (tens of millis on phones) thanks to selective disk reads (Node.js) and Blob / ArrayBuffer (Browser) manipulations. Because you don't need to read whole file and parse through a MBs of data if we an educated guess can be made to only read a couple small chunks where EXIF usually is. Plus each supported data type is approached differently to ensure the best performance.

Observations from testing with +-4MB pictures (*Highest quality, highest resolution Google Pixel photos, tested on a decade old quad code CPU*). Note: These are no scientific measurements.

* Node: Selective disk reads take about 1ms.
* Node: Processing fully buffered data take about 2.5ms on average.
* Browser: ArrayBuffer takes about 2ms
* Browser: Blob can go up to 10ms on average.
* Browser: \<img> with Object URL as a src varies between 5ms to 30ms
* Drag-n-dropping gallery of 90 images took 160ms to load, parse and create exif objects. Extracting GPS data and logging it to console took another 60ms (220ms all together).
* Phones are significantly slower. Usually 40-150ms per photo. This is seriously impacted by loading the photo into browser, not so much of a parsing problem. But real world photo-to-exif time can be as slow as 150ms.

## TODOs and Future ideas
* ICC
* WebP image support
* Parsing readernotes. Probably as an additional opt-in extension file to keep the core as light as possible. [node-exif](https://github.com/gomfunkel/node-exif/tree/master/lib/exif/makernotes) module already has a few great implementations and [PRs](https://github.com/gomfunkel/node-exif/issues/25) ([Canon makernote](https://gist.github.com/redaktor/bae0ef2377ab70bc5276)).

## Licence

MIT, Mike Kovařík, Mutiny.cz