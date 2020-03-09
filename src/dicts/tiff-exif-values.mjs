import {tagValues, createDictionary} from '../tags.mjs'


let exif = createDictionary(tagValues, 'exif', [

	// ExposureProgram
	[0x8822, {
		0: 'Not defined',
		1: 'Manual',
		2: 'Normal program',
		3: 'Aperture priority',
		4: 'Shutter priority',
		5: 'Creative program',
		6: 'Action program',
		7: 'Portrait mode',
		8: 'Landscape mode'
	}],

	// ComponentsConfiguration
	[0x9101, {
		0: '-',
		1: 'Y',
		2: 'Cb',
		3: 'Cr',
		4: 'R',
		5: 'G',
		6: 'B'
	}],

	// MeteringMode
	[0x9207, {
		0:  'Unknown',
		1:  'Average',
		2:  'CenterWeightedAverage',
		3:  'Spot',
		4:  'MultiSpot',
		5:  'Pattern',
		6:  'Partial',
		255: 'Other'
	}],

	// LightSource
	[0x9208, {
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
	}],

	// Flash
	[0x9209, {
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
	}],

	// SensingMethod
	[0xa217, {
		1: 'Not defined',
		2: 'One-chip color area sensor',
		3: 'Two-chip color area sensor',
		4: 'Three-chip color area sensor',
		5: 'Color sequential area sensor',
		7: 'Trilinear sensor',
		8: 'Color sequential linear sensor'
	}],

	// FileSource
	[0xa300, {
		1: 'Film Scanner',
		2: 'Reflection Print Scanner',
		3: 'Digital Camera',
	}],

	// SceneType
	[0xa301, {
		1: 'Directly photographed'
	}],

	// CustomRendered
	[0xa401, {
		0: 'Normal',
		1: 'Custom',
		2: 'HDR (no original saved)',
		3: 'HDR (original saved)',
		4: 'Original (for HDR)',
		6: 'Panorama',
		7: 'Portrait HDR',
		8: 'Portrait',
	}],

	// ExposureMode
	[0xa402, {
		0: 'Auto',
		1: 'Manual',
		2: 'Auto bracket',
	}],

	// WhiteBalance
	[0xa403, {
		0: 'Auto',
		1: 'Manual'
	}],

	// SceneCaptureType
	[0xa406, {
		0: 'Standard',
		1: 'Landscape',
		2: 'Portrait',
		3: 'Night',
		4: 'Other',
	}],

	// GainControl
	[0xa407, {
		0: 'None',
		1: 'Low gain up',
		2: 'High gain up',
		3: 'Low gain down',
		4: 'High gain down'
	}],

	// SubjectDistanceRange
	[0xa40c, {
		0: 'Unknown',
		1: 'Macro',
		2: 'Close',
		3: 'Distant'
	}],

	// CompositeImage
	[0xa460, {
		0: 'Unknown',
		1: 'Not a Composite Image',
		2: 'General Composite Image',
		3: 'Composite Image Captured While Shooting',
	}],

])


// FocalPlaneResolutionUnit
const shared1 = {
	1: 'No absolute unit of measurement',
	2: 'Inch',
	3: 'Centimeter',
}
exif.set(0x9210, shared1)
exif.set(0xa210, shared1)

// Contrast, Saturation, Sharpness
const shared2 = {
	0: 'Normal',
	1: 'Low',
	2: 'High'
}
exif.set(0xa408, shared2)
exif.set(0xa409, shared2)
exif.set(0xa40a, shared2)
