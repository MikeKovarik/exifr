import {AppSegment, parsers} from './core.mjs'
import {
	getUint8,
	getUint16,
	getUint32,
	toString,
	BufferView,
	BufferCursor
} from '../buff-util.mjs'


const APP_ID_OFFSET = 4;
const APP2_ICC_IDENTIFIER = 'ICC_PROFILE\0';
const ICC_CHUNK_NUMBER_OFFSET = APP_ID_OFFSET + APP2_ICC_IDENTIFIER.length;
const ICC_TOTAL_CHUNKS_OFFSET = ICC_CHUNK_NUMBER_OFFSET + 1;

const PROFILE_HEADER_LENGTH = 84;

var canTranslate = true

console.log('APP2_ICC_IDENTIFIER.length', APP2_ICC_IDENTIFIER.length)
console.log('ICC_CHUNK_NUMBER_OFFSET', ICC_CHUNK_NUMBER_OFFSET)
console.log('ICC_TOTAL_CHUNKS_OFFSET', ICC_TOTAL_CHUNKS_OFFSET)

export default class IccParser extends AppSegment {

	static headerLength = 18

	static canHandle(buffer, offset) {
		return getUint8(buffer, offset + 1) === 0xE2
		/*
			&& getUint32(buffer, offset + 4) === 0x4A464946 // 'JFIF'
			&& getUint8(buffer, offset + 8) === 0x00       // followed by '\0'
		*/
	}

	parse() {
		const {buffer, start, size, end} = this
		console.log('start', start)
		console.log('end', end)

		let slice = buffer.slice(start, end)
		let ab = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength)
		this.dataView = new DataView(ab)
		//this.buffView = new BufferView(ab)
		this.buffView = BufferView.from(this.buffer, this.start, this.size)
		console.log(this.dataView.toString())
		console.log(this.buffView.toString())

		this.output = {}
		this.parseHeader()
		this.parseTags()
		this.translateValues()
		this.translateTags()
		return this.output
	}

	parseHeader() {
		const {dataView} = this

		if (dataView.length < PROFILE_HEADER_LENGTH) {
			throw new Error('ICC header is too short')
		}

		for (const [offset, entry] of Object.entries(iccProfile)) {
			let value = entry.value(dataView, parseInt(offset, 10))
			if (canTranslate && entry.description) value = entry.description(value) || value
			this.output[entry.name] = value
		}
	}

	parseTags() {
		const {dataView} = this

		const tagCount = dataView.getUint32(128)
		this.cursor = 132
		for (let i = 0; i < tagCount; i++) this.parseNextTag()
	}

	parseNextTag() {
		const {dataView} = this

		const code = getStringFromDataView(dataView, this.cursor, 4);
		const tagOffset = dataView.getUint32(this.cursor + 4);
		const tagSize = dataView.getUint32(this.cursor + 8);
		const type = getStringFromDataView(dataView, tagOffset, 4)

		//console.log(type, code, tagOffset, tagSize)

		switch (type) {
			case 'desc':
				this.parseDesc(code, tagOffset)
				break
			case 'mluc':
				this.parseMluc(code, tagOffset)
				break
			case 'text':
				this.parseText(code, tagOffset, tagSize)
				break
			case 'sig ':
				this.parseSig(code, tagOffset)
				break
				/*
			default:
				this.output[code] = 'TO BE PARSED'
				*/
		}

		this.cursor += 12;
	}

	parseDesc(code, tagOffset) {
		let start = tagOffset + 12
		let size  = this.buffView.getUint32(tagOffset + 8) - 1 // last byte is null termination
		this.output[code] = this.buffView.getString(start, size)
	}

	parseText(code, tagOffset, tagSize) {
		let start = tagOffset + 8
		let size  = tagSize - 15
		this.output[code] = this.buffView.getString(start, size)
	}

	// NOTE: some tags end with empty space. TODO: investigate. maybe add .trim() 
	parseSig(code, tagOffset) {
		let start = tagOffset + 8
		this.output[code] = this.buffView.getString(start, 4)
	}

	// Multi Localized Unicode Type
	parseMluc(code, tagOffset) {
		console.log('----- MLUC --------')
		const view = this.buffView

		const recordCount = view.getUint32(tagOffset + 8)
		const recordSize  = view.getUint32(tagOffset + 12)
		let offset = tagOffset + 16
		const val = []
		for (let recordNum = 0; recordNum < recordCount; recordNum++) {
			const languageCode = view.getString(offset + 0, 2)
			const countryCode  = view.getString(offset + 2, 2)
			const textLength   = view.getUint32(offset + 4)
			const textOffset   = view.getUint32(offset + 8)
			const text = view.getUnicodeString(tagOffset + textOffset, textLength)
			val.push({languageCode, countryCode, text})
			offset += recordSize
		}
		if (recordCount === 1) {
			this.output[code] = val[0].text
		} else {
			const valObj = {}
			for (let i = 0; i < val.length; i++) {
				let key = `${val[i].languageCode}-${val[i].countryCode}`
				valObj[key] = val[i].text
			}
			this.output[code] = valObj
		}
	}

	translateTags() {
		let entries = Object.entries(this.output).map(([tag, value]) => [iccTags[tag] || tag, value])
		this.output = Object.fromEntries(entries)
	}

	translateValues() {
		// TODO
		// MSFT => Microsoft
	}

}





function getStringFromDataView(dataView, offset, length) {
	const chars = [];
	for (let i = 0; i < length && offset + i < dataView.byteLength; i++) {
		chars.push(dataView.getUint8(offset + i, false));
	}
	return getAsciiValue(chars).join('');
}

function getAsciiValue(charArray) {
	return charArray.map((charCode) => String.fromCharCode(charCode));
}

function sliceToString(slice) {
	return String.fromCharCode.apply(null, new Uint8Array(slice))
}












const versionMap = {
	0x02000000: '2.0',
	0x02100000: '2.1',
	0x02400000: '2.4',
	0x04000000: '4.0',
	0x04200000: '4.2'
}

const intentMap = {
	0: 'Perceptual',
	1: 'Relative',
	2: 'Saturation',
	3: 'Absolute'
}

const valueMap = {
	// Device
	scnr: 'Scanner',
	mntr: 'Monitor',
	prtr: 'Printer',
	link: 'Link',
	abst: 'Abstract',
	spac: 'Space',
	nmcl: 'Named color',
}
// Platform
const companyMap = {
	appl: 'Apple',
	adbe: 'Adobe',
	msft: 'Microsoft',
	sunw: 'Sun Microsystems',
	sgi:  'Silicon Graphics',
	tgnt: 'Taligent'
}

const iccTags = {
	desc: 'description',
	cprt: 'copyright',
	dmdd: 'deviceModelDescription',
	vued: 'viewingConditionsDescription',
	dmnd: 'deviceManufacturerForDisplay',
	tech: 'technology',
}

/*
    [4, 'cmm'],
    [12, 'deviceClass'],
    [16, 'colorSpace'],
    [20, 'connectionSpace'],
    [40, 'platform'],
    [48, 'manufacturer'],
    [52, 'model'],
    [80, 'creator']
*/

export const iccProfile = {
	4: {
		'name': 'Preferred CMM type',
		'value': (dataView, offset) => getStringFromDataView(dataView, offset, 4),
		'description': (value) => companyMap[value] || undefined,
	},
	8: {
		'name': 'Profile Version',
		'value': (dataView, offset) => {
			return (dataView.getUint8(offset)).toString(10) + '.'
			+ (dataView.getUint8(offset + 1) >> 4).toString(10) + '.'
			+ (dataView.getUint8(offset + 1) % 16).toString(10);
		}
	},
	12: {
		'name': 'Profile/Device class',
		'value': (dataView, offset) => getStringFromDataView(dataView, offset, 4),
		'description': (value) => {
			switch (value.toLowerCase()) {
				case 'scnr': return 'Input Device profile';
				case 'mntr': return 'Display Device profile';
				case 'prtr': return 'Output Device profile';
				case 'link': return 'DeviceLink profile';
				case 'abst': return 'Abstract profile';
				case 'spac': return 'ColorSpace profile';
				case 'nmcl': return 'NamedColor profile';
				case 'cenc': return 'ColorEncodingSpace profile';
				case 'mid ': return 'MultiplexIdentification profile';
				case 'mlnk': return 'MultiplexLink profile';
				case 'mvis': return 'MultiplexVisualization profile';
				default: return value;
			}
		}
	},
	16: {
		'name': 'Color Space',
		'value': (dataView, offset) => getStringFromDataView(dataView, offset, 4)
	},
	20: {
		'name': 'Connection Space',
		'value': (dataView, offset) => getStringFromDataView(dataView, offset, 4)
	},
	24: {
		'name': 'ICC Profile Date',
		'value': (dataView, offset) => parseDate(dataView, offset).toISOString()
	},
	36: {
		'name': 'ICC Signature',
		'value': (dataView, offset) => sliceToString(dataView.buffer.slice(offset, offset + 4))
	},
	40: {
		'name': 'Primary Platform',
		'value': (dataView, offset) => getStringFromDataView(dataView, offset, 4),
		'description': (value) => companyMap[value]
	},
	48: {
		'name': 'Device Manufacturer',
		'value': (dataView, offset) => getStringFromDataView(dataView, offset, 4),
		'description': (value) => companyMap[value]
	},
	52: {
		'name': 'Device Model Number',
		'value': (dataView, offset) => getStringFromDataView(dataView, offset, 4)
	},
	64: {
		'name': 'Rendering Intent',
		'value': (dataView, offset) => dataView.getUint32(offset),
		'description': (value) => {
			switch (value) {
				case 0: return 'Perceptual';
				case 1: return 'Relative Colorimetric';
				case 2: return 'Saturation';
				case 3: return 'Absolute Colorimetric';
				default: return value;
			}
		}
	},

	80: {
		'name': 'Profile Creator',
		'value': (dataView, offset) => getStringFromDataView(dataView, offset, 4)
	},
};

function parseDate(dataView, offset) {
	const year = dataView.getUint16(offset);
	const month = dataView.getUint16(offset + 2) - 1;
	const day = dataView.getUint16(offset + 4);
	const hours = dataView.getUint16(offset + 6);
	const minutes = dataView.getUint16(offset + 8);
	const seconds = dataView.getUint16(offset + 10);
	return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}


parsers.icc = IccParser