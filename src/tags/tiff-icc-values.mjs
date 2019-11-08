import {tagValues} from '../tags.mjs'


const companies = {
	appl: 'Apple',
	adbe: 'Adobe',
	msft: 'Microsoft',
	sunw: 'Sun Microsystems',
	sgi:  'Silicon Graphics',
	tgnt: 'Taligent',
	hp:   'Hewlett-Packard',
}

const devices = {
	// Device
	scnr: 'Scanner',
	mntr: 'Monitor',
	prtr: 'Printer',
	link: 'Link',
	abst: 'Abstract',
	spac: 'Space',
	nmcl: 'Named color',
	cenc: 'ColorEncodingSpace profile',
	mid:  'MultiplexIdentification profile',
	mlnk: 'MultiplexLink profile',
	mvis: 'MultiplexVisualization profile',
}
/*
const devices = {
	scnr: 'Input Device profile',
	mntr: 'Display Device profile',
	prtr: 'Output Device profile',
	link: 'DeviceLink profile',
	abst: 'Abstract profile',
	spac: 'ColorSpace profile',
	nmcl: 'NamedColor profile',
	cenc: 'ColorEncodingSpace profile',
	mid:  'MultiplexIdentification profile',
	mlnk: 'MultiplexLink profile',
	mvis: 'MultiplexVisualization profile',
}
*/
tagValues.icc = {
	//4: companies,
	12: devices,
	40: Object.assign({}, companies, devices),
	48: companies,
	80: companies,
	64: {
		0: 'Perceptual',
		1: 'Relative Colorimetric',
		2: 'Saturation',
		3: 'Absolute Colorimetric',
	},
}