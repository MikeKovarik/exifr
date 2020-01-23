import Exifr from './index-core.js'
export default Exifr


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