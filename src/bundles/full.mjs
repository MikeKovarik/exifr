export * from './lite.mjs'
import * as lite from './lite.mjs'
export default lite


// File Readers
import '../file-readers/FsReader.mjs'
import '../file-readers/Base64Reader.mjs'

// File Parsers
import '../file-parsers/tiff.mjs'
import '../file-parsers/heic.mjs'

// TIFF - Additional tags
import '../dicts/tiff-interop-keys.mjs'
import '../dicts/tiff-other-keys.mjs'
import '../dicts/tiff-gps-values.mjs'

// JFIF
import '../segment-parsers/jfif.mjs'

// ICC
import '../segment-parsers/icc.mjs'
import '../dicts/icc-keys.mjs'
import '../dicts/icc-values.mjs'

// IPTC
import '../segment-parsers/iptc.mjs'
import '../dicts/iptc-keys.mjs'
import '../dicts/iptc-values.mjs'