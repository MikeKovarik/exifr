export * from './index-mini.js'


// File Readers
import './file-readers/FsReader.js'
import './file-readers/Base64Reader.js'
import './file-readers/UrlFetcher.js'
import './file-readers/BlobReader.js'

// File Parser
import './file-parsers/jpeg.js'

// TIFF Parser
import './segment-parsers/tiff-exif.js'

// TIFF Keys
import './dicts/tiff-ifd0-keys.js'
import './dicts/tiff-exif-keys.js'
import './dicts/tiff-gps-keys.js'

// TIFF Values
import './dicts/tiff-ifd0-values.js'
import './dicts/tiff-exif-values.js'

// TIFF Revivers
import './dicts/tiff-revivers.js'