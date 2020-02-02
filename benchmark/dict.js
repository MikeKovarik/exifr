import bench from './benchlib.js'


main()

async function main() {

	// SUITE - CREATION

	let dictObject, dictEntries, dictMap
	await bench('create object ', () => {
		dictObject = createObject()
	})

	await bench('create entries', () => {
		dictEntries = createEntries()
	})

	await bench('create map    ', () => {
		dictMap = createMap()
	})

	// SUITE - GET

	let val

	await bench('object[key] ', () => {
		val = dictObject[0x8827]
		val = dictObject[0x9009]
		val = dictObject[0xa301]
		val = dictObject[0xa302]
		val = dictObject[0xa433]
		val = dictObject[0xfe4e]
		val = dictObject[0xa005]
	})

	await bench('map.get(key)', () => {
		val = dictMap.get(0x8827)
		val = dictMap.get(0x9009)
		val = dictMap.get(0xa301)
		val = dictMap.get(0xa302)
		val = dictMap.get(0xa433)
		val = dictMap.get(0xfe4e)
		val = dictMap.get(0xa005)
	})

	// SUITE - CONVERTING

	let newObject
	let newMap

	await bench('converting object to object', () => {
		newObject = Object.fromEntries(Object.entries(dictObject))
	})

	await bench('converting map to object   ', () => {
		newMap = Object.fromEntries(dictMap.entries())
	})

	// SUITE - COPYING (TRANSLATING)

	await bench('copying object to object', () => {
		newObject = {}
		for (let [key, val] of Object.entries(dictObject)) {
			newObject[key] = val
		}
	})

	await bench('copying map to map      ', () => {
		newMap = new Map
		for (let [key, val] of dictMap) {
			newMap.set(key, val)
		}
	})

	// SUITE - FINDING TAG IN DICT

	await bench('find in object', () => {
		findTagCodeInObject(dictObject, 'Shadows')
		findTagCodeInObject(dictObject, 0xa302)
		findTagCodeInObject(dictObject, 'MakerNote')
		findTagCodeInObject(dictObject, 0xa005)
		findTagCodeInObject(dictObject, 'LensInfo')
		findTagCodeInObject(dictObject, 0x8833)
	})

	await bench('find in map   ', () => {
		findTagCodeInMap(dictMap, 'Shadows')
		findTagCodeInMap(dictMap, 0xa302)
		findTagCodeInMap(dictMap, 'MakerNote')
		findTagCodeInMap(dictMap, 0xa005)
		findTagCodeInMap(dictMap, 'LensInfo')
		findTagCodeInMap(dictMap, 0x8833)
	})

	let dictKeys   = Array.from(dictMap.keys())
	let dictValues = Array.from(dictMap.values())

	await bench('find in map2  ', () => {
		findTagCodeInMap2(dictKeys, dictValues, 'Shadows')
		findTagCodeInMap2(dictKeys, dictValues, 0xa302)
		findTagCodeInMap2(dictKeys, dictValues, 'MakerNote')
		findTagCodeInMap2(dictKeys, dictValues, 0xa005)
		findTagCodeInMap2(dictKeys, dictValues, 'LensInfo')
		findTagCodeInMap2(dictKeys, dictValues, 0x8833)
	})

	await bench('find in map3  ', () => {
		findTagCodeInMap3(dictKeys, dictValues, 'Shadows')
		findTagCodeInMap3(dictKeys, dictValues, 0xa302)
		findTagCodeInMap3(dictKeys, dictValues, 'MakerNote')
		findTagCodeInMap3(dictKeys, dictValues, 0xa005)
		findTagCodeInMap3(dictKeys, dictValues, 'LensInfo')
		findTagCodeInMap3(dictKeys, dictValues, 0x8833)
	})

	// SUITE - FINDING TAG IN DICT

	let untranslated = ['Shadows', 0xa302, 'MakerNote', 0xa005, 'LensInfo', 0x8833]
	let translated

	await bench('translate in object', () => {
		translated = translateTagsFromObject(dictObject, untranslated)
	})

	await bench('translate in map   ', () => {
		translated = translateTagsFromMap(dictMap, untranslated)
	})

	await bench('translate in map2  ', () => {
		translated = translateTagsFromMap2(dictMap, untranslated)
	})

	// SUITE - WHOLE APP SIMULATION

	let dict, tagCodes, tagNames
	await bench('whole app with object', () => {
		dict = createObject()
		tagCodes = translateTagsFromObject(dict, untranslated)
		tagNames = tagCodes.map(code => dict[code])
	})

	await bench('whole app with map   ', () => {
		dict = createMap()
		tagCodes = translateTagsFromMap2(dict, untranslated)
		tagNames = tagCodes.map(code => dict.get(code))
	})

	// SUITE - CONCAT MAP

	//let firstHalf  = dictEntries.slice(0, dictEntries.length / 2)
	//let secondHalf = dictEntries.slice(dictEntries.length / 2, dictEntries.length)
	let firstHalf  = new Map([[1, 'a'], [2, 'b']])
	let secondHalf = [[3, 'c'], [4, 'd']]
	//let secondHalf = new Map([[3, 'c'], [4, 'd']])
	let mergedMap

	await bench('map concatenation 1', () => {
		mergedMap = new Map([...firstHalf].concat([...secondHalf]))
	})

	await bench('map concatenation 2', () => {
		mergedMap = new Map([...firstHalf, ...secondHalf])
	})

	await bench('map concatenation 3', () => {
		mergedMap = new Map([...firstHalf])
		for (let entry of secondHalf) mergedMap.set(entry[0], entry[1])
	})

	// SUITE - CONCAT MAP

	let outputObject
	await bench('map to object - loop assign  ', () => {
		outputObject = {}
		let entry
		for (entry of dictMap)
			outputObject[entry[0], entry[1]]
	})

	await bench('map to object - fromEntries 1', () => {
		outputObject = Object.fromEntries(dictMap)
	})

	await bench('map to object - fromEntries 2', () => {
		outputObject = Object.fromEntries(dictMap.entries())
	})

}

function findTagCodeInObject(dictObject, key) {
	let tagCodeStr, tagCodeNum, tagName
	for (tagCodeStr in dictObject) {
		tagCodeNum = Number(tagCodeStr)
		tagName = dictObject[tagCodeStr]
		return key === tagCodeNum || key === tagName
	}
	return false
}

function findTagCodeInMap(dictMap, key) {
	for (let [tagCodeNum, tagName] of dictMap) {
		return key === tagCodeNum || key === tagName
	}
	return false
}

function findTagCodeInMap2(dictKeys, dictValues, key) {
	if (typeof key === 'number')
		return dictKeys.includes(key)
	else
		return dictValues.includes(key)
}

function findTagCodeInMap3(dictKeys, dictValues, key) {
	let i
	if (typeof key === 'number') {
		for (i = 0; i < dictKeys.length; i++) {
			if (dictKeys[i] === key) return true
		}
	} else {
		for (i = 0; i < dictValues.length; i++) {
			if (dictValues[i] === key) return true
		}
	}
	return false
}

function translateTagsFromObject(dictObject, tags) {
	let translatedTags = []
	let tagCodeStr, tagCodeNum, tagName
	for (tagCodeStr in dictObject) {
		tagCodeNum = Number(tagCodeStr)
		tagName = dictObject[tagCodeStr]
		if (tags.includes(tagCodeNum) || tags.includes(tagName))
			translatedTags.push(tagCodeNum)
	}
	return translatedTags
}

function translateTagsFromMap(dictMap, tags) {
	let translatedTags = []
	for (let [tagCodeNum, tagName] of dictMap) {
		if (tags.includes(tagCodeNum) || tags.includes(tagName))
			translatedTags.push(tagCodeNum)
	}
	return translatedTags
}

function translateTagsFromMap2(dictMap, tags) {
	let translatedTags = []
	let entry
	for (entry of dictMap) {
		if (tags.includes(entry[0]) || tags.includes(entry[1]))
			translatedTags.push(entry[0])
	}
	return translatedTags
}

function createObject() {
	return {
		0x829a: 'ExposureTime',
		0x829d: 'FNumber',
		0x8822: 'ExposureProgram',
		0x8824: 'SpectralSensitivity',
		0x8827: 'ISO',
		0x882a: 'TimeZoneOffset',
		0x882b: 'SelfTimerMode',
		0x8830: 'SensitivityType',
		0x8831: 'StandardOutputSensitivity',
		0x8832: 'RecommendedExposureIndex',
		0x8833: 'ISOSpeed',
		0x8834: 'ISOSpeedLatitudeyyy',
		0x8835: 'ISOSpeedLatitudezzz',
		0x9000: 'ExifVersion',
		0x9003: 'DateTimeOriginal',
		0x9004: 'CreateDate',
		0x9009: 'GooglePlusUploadCode',
		0x9010: 'OffsetTime',
		0x9011: 'OffsetTimeOriginal',
		0x9012: 'OffsetTimeDigitized',
		0x9101: 'ComponentsConfiguration',
		0x9102: 'CompressedBitsPerPixel',
		0x9201: 'ShutterSpeedValue',
		0x9202: 'ApertureValue',
		0x9203: 'BrightnessValue',
		0x9204: 'ExposureCompensation',
		0x9205: 'MaxApertureValue',
		0x9206: 'SubjectDistance',
		0x9207: 'MeteringMode',
		0x9208: 'LightSource',
		0x9209: 'Flash',
		0x920a: 'FocalLength',
		0x9211: 'ImageNumber',
		0x9212: 'SecurityClassification',
		0x9213: 'ImageHistory',
		0x9214: 'SubjectArea',
		0x927c: 'MakerNote',
		0x9286: 'UserComment',
		0x9290: 'SubSecTime',
		0x9291: 'SubSecTimeOriginal',
		0x9292: 'SubSecTimeDigitized',
		0x9400: 'AmbientTemperature',
		0x9401: 'Humidity',
		0x9402: 'Pressure',
		0x9403: 'WaterDepth',
		0x9404: 'Acceleration',
		0x9405: 'CameraElevationAngle',
		0xa000: 'FlashpixVersion',
		0xa001: 'ColorSpace',
		0xa002: 'ExifImageWidth',
		0xa003: 'ExifImageHeight',
		0xa004: 'RelatedSoundFile',
		0xa20b: 'FlashEnergy',
		0xa20e: 'FocalPlaneXResolution',
		0xa20f: 'FocalPlaneYResolution',
		0xa210: 'FocalPlaneResolutionUnit',
		0xa214: 'SubjectLocation',
		0xa215: 'ExposureIndex',
		0xa217: 'SensingMethod',
		0xa300: 'FileSource',
		0xa301: 'SceneType',
		0xa302: 'CFAPattern',
		0xa401: 'CustomRendered',
		0xa402: 'ExposureMode',
		0xa403: 'WhiteBalance',
		0xa404: 'DigitalZoomRatio',
		0xa405: 'FocalLengthIn35mmFormat',
		0xa406: 'SceneCaptureType',
		0xa407: 'GainControl',
		0xa408: 'Contrast',
		0xa409: 'Saturation',
		0xa40a: 'Sharpness',
		0xa40c: 'SubjectDistanceRange',
		0xa420: 'ImageUniqueID',
		0xa430: 'OwnerName',
		0xa431: 'SerialNumber',
		0xa432: 'LensInfo',
		0xa433: 'LensMake',
		0xa434: 'LensModel',
		0xa435: 'LensSerialNumber',
		0xa460: 'CompositeImage',
		0xa461: 'CompositeImageCount',
		0xa462: 'CompositeImageExposureTimes',
		0xa500: 'Gamma',
		0xea1c: 'Padding',
		0xea1d: 'OffsetSchema',
		0xfde8: 'OwnerName',
		0xfde9: 'SerialNumber',
		0xfdea: 'Lens',
		0xfe4c: 'RawFile',
		0xfe4d: 'Converter',
		0xfe4e: 'WhiteBalance',
		0xfe51: 'Exposure',
		0xfe52: 'Shadows',
		0xfe53: 'Brightness',
		0xfe54: 'Contrast',
		0xfe55: 'Saturation',
		0xfe56: 'Sharpness',
		0xfe57: 'Smoothness',
		0xfe58: 'MoireFilter',
		// not actually assigned to IFD0 but offten found here
		0xa005: 'InteropIFD',
	}
}

function createEntries() {
	return [
		[0x829a, 'ExposureTime'],
		[0x829d, 'FNumber'],
		[0x8822, 'ExposureProgram'],
		[0x8824, 'SpectralSensitivity'],
		[0x8827, 'ISO'],
		[0x882a, 'TimeZoneOffset'],
		[0x882b, 'SelfTimerMode'],
		[0x8830, 'SensitivityType'],
		[0x8831, 'StandardOutputSensitivity'],
		[0x8832, 'RecommendedExposureIndex'],
		[0x8833, 'ISOSpeed'],
		[0x8834, 'ISOSpeedLatitudeyyy'],
		[0x8835, 'ISOSpeedLatitudezzz'],
		[0x9000, 'ExifVersion'],
		[0x9003, 'DateTimeOriginal'],
		[0x9004, 'CreateDate'],
		[0x9009, 'GooglePlusUploadCode'],
		[0x9010, 'OffsetTime'],
		[0x9011, 'OffsetTimeOriginal'],
		[0x9012, 'OffsetTimeDigitized'],
		[0x9101, 'ComponentsConfiguration'],
		[0x9102, 'CompressedBitsPerPixel'],
		[0x9201, 'ShutterSpeedValue'],
		[0x9202, 'ApertureValue'],
		[0x9203, 'BrightnessValue'],
		[0x9204, 'ExposureCompensation'],
		[0x9205, 'MaxApertureValue'],
		[0x9206, 'SubjectDistance'],
		[0x9207, 'MeteringMode'],
		[0x9208, 'LightSource'],
		[0x9209, 'Flash'],
		[0x920a, 'FocalLength'],
		[0x9211, 'ImageNumber'],
		[0x9212, 'SecurityClassification'],
		[0x9213, 'ImageHistory'],
		[0x9214, 'SubjectArea'],
		[0x927c, 'MakerNote'],
		[0x9286, 'UserComment'],
		[0x9290, 'SubSecTime'],
		[0x9291, 'SubSecTimeOriginal'],
		[0x9292, 'SubSecTimeDigitized'],
		[0x9400, 'AmbientTemperature'],
		[0x9401, 'Humidity'],
		[0x9402, 'Pressure'],
		[0x9403, 'WaterDepth'],
		[0x9404, 'Acceleration'],
		[0x9405, 'CameraElevationAngle'],
		[0xa000, 'FlashpixVersion'],
		[0xa001, 'ColorSpace'],
		[0xa002, 'ExifImageWidth'],
		[0xa003, 'ExifImageHeight'],
		[0xa004, 'RelatedSoundFile'],
		[0xa20b, 'FlashEnergy'],
		[0xa20e, 'FocalPlaneXResolution'],
		[0xa20f, 'FocalPlaneYResolution'],
		[0xa210, 'FocalPlaneResolutionUnit'],
		[0xa214, 'SubjectLocation'],
		[0xa215, 'ExposureIndex'],
		[0xa217, 'SensingMethod'],
		[0xa300, 'FileSource'],
		[0xa301, 'SceneType'],
		[0xa302, 'CFAPattern'],
		[0xa401, 'CustomRendered'],
		[0xa402, 'ExposureMode'],
		[0xa403, 'WhiteBalance'],
		[0xa404, 'DigitalZoomRatio'],
		[0xa405, 'FocalLengthIn35mmFormat'],
		[0xa406, 'SceneCaptureType'],
		[0xa407, 'GainControl'],
		[0xa408, 'Contrast'],
		[0xa409, 'Saturation'],
		[0xa40a, 'Sharpness'],
		[0xa40c, 'SubjectDistanceRange'],
		[0xa420, 'ImageUniqueID'],
		[0xa430, 'OwnerName'],
		[0xa431, 'SerialNumber'],
		[0xa432, 'LensInfo'],
		[0xa433, 'LensMake'],
		[0xa434, 'LensModel'],
		[0xa435, 'LensSerialNumber'],
		[0xa460, 'CompositeImage'],
		[0xa461, 'CompositeImageCount'],
		[0xa462, 'CompositeImageExposureTimes'],
		[0xa500, 'Gamma'],
		[0xea1c, 'Padding'],
		[0xea1d, 'OffsetSchema'],
		[0xfde8, 'OwnerName'],
		[0xfde9, 'SerialNumber'],
		[0xfdea, 'Lens'],
		[0xfe4c, 'RawFile'],
		[0xfe4d, 'Converter'],
		[0xfe4e, 'WhiteBalance'],
		[0xfe51, 'Exposure'],
		[0xfe52, 'Shadows'],
		[0xfe53, 'Brightness'],
		[0xfe54, 'Contrast'],
		[0xfe55, 'Saturation'],
		[0xfe56, 'Sharpness'],
		[0xfe57, 'Smoothness'],
		[0xfe58, 'MoireFilter'],
		[0xa005, 'InteropIFD'],
	]
}

function createMap() {
	return new Map(createEntries())
}