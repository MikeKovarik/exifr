import Exifr from './index-lite.js'
export default Exifr

// Parsers
import './segment-parsers/jfif.js'
import './segment-parsers/iptc.js'
import './segment-parsers/icc.js'
import './segment-parsers/xmp.js'

// TIFF - Additional tags
import './tags/tiff-interop-keys.js'
import './tags/tiff-other-keys.js'
import './tags/tiff-gps-values.js'

// ICC
import './tags/icc-keys.js'
import './tags/icc-values.js'

// IPTC
import './tags/iptc-keys.js'
import './tags/iptc-values.js'