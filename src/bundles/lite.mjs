export * from './mini.mjs'
import * as mini from './mini.mjs'
export default mini


// File Readers
import '../file-readers/UrlFetcher.mjs'
import '../file-readers/BlobReader.mjs'

// File Parser
import '../file-parsers/jpeg.mjs'
import '../file-parsers/heif.mjs'

// TIFF Parser
import '../segment-parsers/tiff-exif.mjs'

// TIFF Keys
import '../dicts/tiff-ifd0-keys.mjs'
import '../dicts/tiff-exif-keys.mjs'
import '../dicts/tiff-gps-keys.mjs'

// TIFF Values
import '../dicts/tiff-ifd0-values.mjs'
import '../dicts/tiff-exif-values.mjs'

// TIFF Revivers
import '../dicts/tiff-revivers.mjs'

// XMP
import '../segment-parsers/xmp.mjs'