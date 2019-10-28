// Exposed object of tag dictionaries that either user specifies or exifr loads into.
export const tags = {}

export function findTag(tagName) {
	for (let [code, name] of Object.entries(tags))
		if (tagName === name) return Number(code)
}

export const TAG_MAKERNOTE  = 0x927C
export const TAG_USERCOMMENT = 0x9286

export const valueString = {
	ExposureProgram: {
		0: 'Not defined',
		1: 'Manual',
		2: 'Normal program',
		3: 'Aperture priority',
		4: 'Shutter priority',
		5: 'Creative program',
		6: 'Action program',
		7: 'Portrait mode',
		8: 'Landscape mode'
	},
	MeteringMode: {
		0:  'Unknown',
		1:  'Average',
		2:  'CenterWeightedAverage',
		3:  'Spot',
		4:  'MultiSpot',
		5:  'Pattern',
		6:  'Partial',
		255: 'Other'
	},
	LightSource: {
		0:   'Unknown',
		1:   'Daylight',
		2:   'Fluorescent',
		3:   'Tungsten (incandescent light)',
		4:   'Flash',
		9:   'Fine weather',
		10:  'Cloudy weather',
		11:  'Shade',
		12:  'Daylight fluorescent (D 5700 - 7100K)',
		13:  'Day white fluorescent (N 4600 - 5400K)',
		14:  'Cool white fluorescent (W 3900 - 4500K)',
		15:  'White fluorescent (WW 3200 - 3700K)',
		17:  'Standard light A',
		18:  'Standard light B',
		19:  'Standard light C',
		20:  'D55',
		21:  'D65',
		22:  'D75',
		23:  'D50',
		24:  'ISO studio tungsten',
		255: 'Other'
	},
	Flash: {
		0x00: 'Flash did not fire',
		0x01: 'Flash fired',
		0x05: 'Strobe return light not detected',
		0x07: 'Strobe return light detected',
		0x09: 'Flash fired, compulsory flash mode',
		0x0D: 'Flash fired, compulsory flash mode, return light not detected',
		0x0F: 'Flash fired, compulsory flash mode, return light detected',
		0x10: 'Flash did not fire, compulsory flash mode',
		0x18: 'Flash did not fire, auto mode',
		0x19: 'Flash fired, auto mode',
		0x1D: 'Flash fired, auto mode, return light not detected',
		0x1F: 'Flash fired, auto mode, return light detected',
		0x20: 'No flash function',
		0x41: 'Flash fired, red-eye reduction mode',
		0x45: 'Flash fired, red-eye reduction mode, return light not detected',
		0x47: 'Flash fired, red-eye reduction mode, return light detected',
		0x49: 'Flash fired, compulsory flash mode, red-eye reduction mode',
		0x4D: 'Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected',
		0x4F: 'Flash fired, compulsory flash mode, red-eye reduction mode, return light detected',
		0x59: 'Flash fired, auto mode, red-eye reduction mode',
		0x5D: 'Flash fired, auto mode, return light not detected, red-eye reduction mode',
		0x5F: 'Flash fired, auto mode, return light detected, red-eye reduction mode'
	},
	FocalPlaneResolutionUnit: {
		1: 'No absolute unit of measurement',
		2: 'Inch',
		3: 'Centimeter',
	},
	SensingMethod: {
		1: 'Not defined',
		2: 'One-chip color area sensor',
		3: 'Two-chip color area sensor',
		4: 'Three-chip color area sensor',
		5: 'Color sequential area sensor',
		7: 'Trilinear sensor',
		8: 'Color sequential linear sensor'
	},
	SceneType: {
		1: 'Directly photographed'
	},
	CFAPattern: {
		0: 'Red',
		1: 'Green',
		2: 'Blue',
		3: 'Cyan',
		4: 'Magenta',
		5: 'Yellow',
		6: 'White',
	},
	CustomRendered: {
		0: 'Normal process',
		1: 'Custom process'
	},
	ExposureMode: {
		0: 'Auto exposure',
		1: 'Manual exposure',
		2: 'Auto bracket',
	},
	WhiteBalance: {
		0: 'Auto white balance',
		1: 'Manual white balance'
	},
	SceneCaptureType: {
		0: 'Standard',
		1: 'Landscape',
		2: 'Portrait',
		3: 'Night scene'
	},
	GainControl: {
		0: 'None',
		1: 'Low gain up',
		2: 'High gain up',
		3: 'Low gain down',
		4: 'High gain down'
	},
	Contrast: {
		0: 'Normal',
		1: 'Soft',
		2: 'Hard'
	},
	Saturation: {
		0: 'Normal',
		1: 'Low saturation',
		2: 'High saturation'
	},
	Sharpness: {
		0: 'Normal',
		1: 'Soft',
		2: 'Hard'
	},
	SubjectDistanceRange: {
		0: 'Unknown',
		1: 'Macro',
		2: 'Close view',
		3: 'Distant view'
	},
	FileSource: {
		3: 'DSC' // Digital Still Camera
	},
	Components: {
		0: '-',
		1: 'Y',
		2: 'Cb',
		3: 'Cr',
		4: 'R',
		5: 'G',
		6: 'B'
	}
}


export const dates = [
	'DateTimeOriginal',
	'DateTimeDigitized',
	'ModifyDate',
	//'GPSDateStamp',
]

