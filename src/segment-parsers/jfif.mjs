import {AppSegmentParserBase} from '../parser.mjs'
import {segmentParsers} from '../plugins.mjs'


// tags https://exiftool.org/TagNames/JFIF.html
export default class Jfif extends AppSegmentParserBase {

	static type = 'jfif'
	static headerLength = 9

	static canHandle(buffer, offset) {
		return buffer.getUint8(offset + 1)  === 0xE0
			&& buffer.getUint32(offset + 4) === 0x4A464946 // 'JFIF'
			&& buffer.getUint8(offset + 8)  === 0x00       // followed by '\0'
	}

	parse() {
		return {
			JFIFVersion:     this.chunk.getUint16(0),
			ResolutionUnit:  this.chunk.getUint8(2),
			XResolution:     this.chunk.getUint16(3),
			YResolution:     this.chunk.getUint16(5),
			ThumbnailWidth:  this.chunk.getUint8(7),
			ThumbnailHeight: this.chunk.getUint8(8),
		}
	}

	// TODO: hook this in into revive/translate API
	/*
	static prettify(jfif) {
		let versionInt = jfif.JFIFVersion
		jfif.JFIFVersion = ((versionInt & 0xFF00) >> 8).toString(16) + '.' + (versionInt & 0x00FF).toString(16).padStart(2, '0')
		jfif.ResolutionUnit = jfif.ResolutionUnit === 2 ? 'cm' : jfif.ResolutionUnit === 1 ? 'inches' : jfif.ResolutionUnit
		return jfif
	}
	*/

}

segmentParsers.set('jfif', Jfif)