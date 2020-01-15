import Exifr from './index-lite.js'
export default Exifr


// File Parsers
import './file-parsers/tiff.js'
import './file-parsers/heic.js'

// Segment Parsers
import './segment-parsers/jfif.js'
import './segment-parsers/iptc.js'
import './segment-parsers/icc.js'
import './segment-parsers/xmp.js'

// TIFF - Additional tags
import './dicts/tiff-interop-keys.js'
import './dicts/tiff-other-keys.js'
import './dicts/tiff-gps-values.js'

// ICC
import './dicts/icc-keys.js'
import './dicts/icc-values.js'

// IPTC
import './dicts/iptc-keys.js'
import './dicts/iptc-values.js'