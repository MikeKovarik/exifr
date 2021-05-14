// only full bundle includes Node.js polyfill for fetch()
import '../polyfill/fetch-node.mjs'


export * from './lite.mjs'
import * as lite from './lite.mjs'
export default lite


// Highlevel API: parseSidecar()
export * from '../highlevel/sidecar.mjs'

// File Readers
import '../file-readers/FsReader.mjs'
import '../file-readers/Base64Reader.mjs'

// File Parsers
import '../file-parsers/tiff.mjs'
import '../file-parsers/heif.mjs'
import '../file-parsers/png.mjs'

// TIFF - Additional tags
import '../dicts/tiff-interop-keys.mjs'
import '../dicts/tiff-other-keys.mjs'
import '../dicts/tiff-gps-values.mjs'

// JFIF (JPEG header)
import '../segment-parsers/jfif.mjs'
import '../dicts/jfif-keys.mjs'

// IHDR (PNG header)
import '../segment-parsers/ihdr.mjs'
import '../dicts/ihdr-keys.mjs'
import '../dicts/ihdr-values.mjs'

// ICC
import '../segment-parsers/icc.mjs'
import '../dicts/icc-keys.mjs'
import '../dicts/icc-values.mjs'

// IPTC
import '../segment-parsers/iptc.mjs'
import '../dicts/iptc-keys.mjs'
import '../dicts/iptc-values.mjs'