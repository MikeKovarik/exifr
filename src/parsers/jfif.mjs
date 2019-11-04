import {AppSegment, parsers} from './core.mjs'
import {CursorView} from '../util/BufferView.mjs'


export default class Jfif extends AppSegment {

	static id = 'jfif'
	static headerLength = 9

	static canHandle(buffer, offset) {
		return buffer.getUint8(offset + 1) === 0xE0
			&& buffer.getUint32(offset + 4) === 0x4A464946 // 'JFIF'
			&& buffer.getUint8(offset + 8) === 0x00       // followed by '\0'
	}

	parse() {
		this.view = new CursorView(this.buffer, this.start)
		let jfif = {
			version:    this.view.getUint16(),
			units:      this.view.getUint8(),
			Xdensity:   this.view.getUint16(),
			Ydensity:   this.view.getUint16(),
			Xthumbnail: this.view.getUint8(),
			Ythumbnail: this.view.getUint8(),
		}
		this.output = this.options.mergeOutput ? {jfif} : jfif
		return this.output
	}

	static prettify(jfif) {
		let versionInt = jfif.version
		jfif.version = ((versionInt & 0xFF00) >> 8).toString(16) + '.' + (versionInt & 0x00FF).toString(16).padStart(2, '0')
		jfif.units = jfif.units === 2 ? 'cm' : jfif.units === 1 ? 'inches' : jfif.units
		return jfif
	}

}

parsers.jfif = Jfif
