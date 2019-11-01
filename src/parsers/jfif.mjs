import {AppSegment, parsers} from './core.mjs'
import {
	getUint8,
	getUint16,
	getUint32,
	CursorView
} from '../util/BufferView.mjs'

parsers.jfif = class Jfif extends AppSegment {

	static headerLength = 9

	static canHandle(buffer, offset) {
		return getUint8(buffer, offset + 1) === 0xE0
			&& getUint32(buffer, offset + 4) === 0x4A464946 // 'JFIF'
			&& getUint8(buffer, offset + 8) === 0x00       // followed by '\0'
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