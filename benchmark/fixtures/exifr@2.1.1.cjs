(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define('exifr', ['exports'], factory) :
	(global = global || self, factory(global.exifr = {}));
}(this, (function (exports) { 'use strict';

	var hasBuffer = typeof Buffer !== 'undefined';
	var isBrowser = typeof navigator !== 'undefined';
	var isWorker = isBrowser && typeof HTMLImageElement === 'undefined';
	var isNode = typeof global !== 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node;

	// Web Browser's binary data are stored in ArrayBuffer. To access it we can use
	// DataView class which has similar methods to Node's Buffer class.
	// This file contains methods that smooth the process of using etiher DataView o Buffer
	// in the parser code.

	function getUint8(buffer, offset) {
		if (buffer.getUint8)	return buffer.getUint8(offset)
		else					return buffer[offset]
	}

	function getInt8(buffer, offset) {
		if (buffer.getUint8)	return buffer.getUint8(offset)
		else					return buffer.readInt8(offset)
	}

	function getUint16(buffer, offset, littleEndian = false) {
		if (buffer.getUint16)	return buffer.getUint16(offset, littleEndian)
		else if (littleEndian)	return buffer.readUInt16LE(offset)
		else					return buffer.readUInt16BE(offset)
	}

	function getUint32(buffer, offset, littleEndian = false) {
		if (buffer.getUint32)	return buffer.getUint32(offset, littleEndian)
		else if (littleEndian)	return buffer.readUInt32LE(offset)
		else					return buffer.readUInt32BE(offset)
	}

	function getInt16(buffer, offset, littleEndian = false) {
		if (buffer.getInt16)	return buffer.getInt16(offset, littleEndian)
		else if (littleEndian)	return buffer.readInt16LE(offset)
		else					return buffer.readInt16BE(offset)
	}

	function getInt32(buffer, offset, littleEndian = false) {
		if (buffer.getInt32)	return buffer.getInt32(offset, littleEndian)
		else if (littleEndian)	return buffer.readInt32LE(offset)
		else					return buffer.readInt32BE(offset)
	}

	// KEEP IN MIND!
	// Node's buffer.slice() returns new Buffer pointing to the same memory.
	// Web's arrayBuffer.slice() returns new ArrayBuffer with newly copied data.
	// Web's arrayBuffer.subarray() returns new ArrayBuffer pointing to the same memory. Just like Node's buffer.slice.
	// NOTE: We're only using this method when we're outputting unprocessed slices of binary data to user.
	//       Internally we just use the original ArrayBuffer with offsets because wrapping a slice in DataView
	//       Would just return view over the whole original ArrayBuffer.
	function slice(buffer, start, end) {
		if (buffer.slice)
			return buffer.slice(start, end)
		else
			return (new Uint8Array(buffer.buffer)).subarray(start, end)
	}

	// NOTE: EXIF strings are ASCII encoded, but since ASCII is subset of UTF-8
	//       we can safely use it along with TextDecoder API.
	function toString(buffer, start, end) {
		if (buffer instanceof DataView) {
			if (hasBuffer) {
				return Buffer.from(buffer.buffer)
					.slice(start, end)
					.toString('ascii', start, end)
			} else {
				var decoder = new TextDecoder('utf-8');
				return decoder.decode(slice(buffer, start, end))
			}
		} else {
			return buffer.toString('ascii', start, end)
		}
	}

	const defaultOptions = {

		// READING & PARSING

		// We're trying not to read the whole file to increase performance but certain
		// segments (IPTC, XMP) require whole file to be buffered and parsed through.
		//forceWholeFile: false,
		// Only the first 512 Bytes are scanned for EXIF due to performance reasons.
		// Setting this to true enables searching through the whole file.
		//allowWholeFile: false,

		// true - force fetching whole file / reading whole file (whole file mode)
		// undefined - allow reading additional chunks (chunked mode)
		// false - do not allow reading additional chunks (chunked mode)
		wholeFile: undefined,

		// Size of the chunk that can be scanned for EXIF.
		seekChunkSize: 512,
		// In browser its sometimes better to download larger chunk in hope that it contains the
		// whole EXIF (and not just its begining like in case of seekChunkSize) in prevetion
		// of additional loading and fetching.
		parseChunkSize: 64 * 1024,

		// Translate enum values to strings, convert dates to Date instances, etc...
		postProcess: true,
		// Changes output format by merging all segments and blocks into single object.
		// NOTE: Causes loss of thumbnail EXIF data.
		mergeOutput: true,

		// PARSED SEGMENTS

		// APP1 - TIFF - The basic EXIF tags (image, exif, gps)
		tiff: true,
		// APP1 - XMP = XML based extension, often used by editors like Photoshop.
		xmp: false,
		// APP2 - ICC - Not implemented yet
		icc: false,
		// APP13 - IPTC - Captions and copyrights
		iptc: false,

		// TIFF BLOCKS
		// APP1 - Exif IFD.
		exif: true,
		// APP1 - GPS IFD - GPS latitue and longitude data.
		gps: true,
		// APP1 - Interop IFD - This is a thing too.
		interop: false,
		// APP1 - IFD1 - Size and other information about embeded thumbnail.
		thumbnail: false,

	};

	function processOptions(userOptions = {}) {
		let options = Object.assign({}, defaultOptions);
		if (userOptions === true || userOptions === false) {
			for (let key in options) options[key] = userOptions;
			options.mergeOutput = defaultOptions.mergeOutput;
			options.postProcess = defaultOptions.postProcess;
		} else {
			Object.assign(options, userOptions);
		}
		if (options.mergeOutput) options.thumbnail = false;
		return options
	}

	if (isNode) {
		if (typeof require === 'function')
			var fsPromise = Promise.resolve(require('fs').promises);
		else
			var fsPromise = import(/* webpackIgnore: true */ 'fs').then(module => module.promises);
	}


	// TODO: - minified UMD bundle
	// TODO: - offer two UMD bundles (with tags.mjs dictionary and without)
	// TODO: - API for including 3rd party XML parser
	// TODO: - better code & file structure
	// TODO: - JFIF: it usually only has 4 props with no practical use. but for completence
	// TODO: - ICC profile


	class Reader {

		constructor(options) {
			this.options = processOptions(options);
		}

		async read(arg) {
			if (typeof arg === 'string')
				return this.readString(arg)
			else if (isBrowser && !isWorker && arg instanceof HTMLImageElement)
				return this.readString(arg.src)
			else if (hasBuffer && Buffer.isBuffer(arg))
				return this.readBuffer(arg)
			else if (arg instanceof Uint8Array)
				return this.readUint8Array(arg)
			else if (arg instanceof ArrayBuffer)
				return this.readArrayBuffer(arg)
			else if (arg instanceof DataView)
				return this.readBuffer(arg)
			else if (isBrowser && arg instanceof Blob)
				return this.readBlob(arg)
			else
				throw new Error('Invalid input argument')
		}

		readString(string) {
			if (isBase64Url(string))
				return this.readBase64(string)
			else if (isBrowser)
				return this.readUrl(string)
			else if (isNode)
				return this.readFileFromDisk(string)
			else
				throw new Error('Invalid input argument')
		}

		readUint8Array(uint8arr) {
			return this.readArrayBuffer(uint8arr.buffer)
		}

		readArrayBuffer(arrayBuffer) {
			return this.readBuffer(new DataView(arrayBuffer))
		}

		readBuffer(buffer) {
			let tiffPosition = findTiff(buffer);
			if (tiffPosition === undefined) return
			return [buffer, tiffPosition]
		}

		async readBlob(blob) {
			this.reader = new BlobReader(blob, this.options);
			return this.reader.read(this.options.parseChunkSize)
		}

		async readUrl(url) {
			this.reader = new UrlReader(url, this.options);
			return this.reader.read(this.options.parseChunkSize)
		}

		async readBase64(base64) {
			this.reader = new Base64Reader(base64, this.options);
			return this.reader.read(this.options.seekChunkSize)
		}

		async readFileFromDisk(filePath) {
			this.reader = new FsReader(filePath, this.options);
			return this.reader.read()
		}

		get mode() {
			return this.reader ? 'chunked' : 'whole'
		}

	}



	// This method came through three iterations. Tested with 4MB file with EXIF at the beginning.
	// iteration #1 - Fetch whole file.
	//              - Took about 23ms on average.
	//              - It meant unnecessary conversion of whole 4MB
	// iteration #2 - Fetch first 512 bytes, find exif, then fetch additional kilobytes of exif to be parsed.
	//              - Exactly like what we do with Node's readFile() method.
	//              - Slightly faster. 18ms on average.
	//              - Certainly more efficient processing-wise. Only beginning of the file was read and converted.
	//              - But the additional read of the exif chunk is expensive time-wise because browser's fetch and
	//              - Blob<->ArrayBuffer manipulations are not as fast as Node's low-level fs.open() & fs.read().
	// iteration #3 - This one we landed on.
	//              - 11ms on average. (As fast as Node)
	//              - Compromise between time and processing costs.
	//              - Fetches first 64KB of the file. In most cases, EXIF isn't larger than that.
	//              - In most cases, the 64KB is enough and we don't need additional fetch/convert operation.
	//              - But we can do the second read if needed (edge cases) where the performance wouldn't be great anyway.
	// It can be used with Blobs, URLs, Base64 (URL).
	// blobs and fetching from url uses larger chunks with higher chances of having the whole exif within (iteration 3).
	// base64 string (and base64 based url) uses smaller chunk at first (iteration 2).

	// Accepts file path and uses lower-level FS APIs to open the file, read the first 512 bytes
	// trying to locate EXIF and then reading only the portion of the file where EXIF is if found.
	// If the EXIF is not found within the first 512 Bytes. the range can be adjusted by user,
	// or it falls back to reading the whole file if enabled with options.allowWholeFile.

	class ChunkedReader {
		
		constructor(input, options) {
			this.input = input;
			this.options = options;
		}

		async read(size) {
			// Reading additional segments (XMP, ICC, IPTC) requires whole file to be loaded.
			// Chunked reading is only available for simple exif (APP1) FTD0
			if (this.forceWholeFile) return this.readWhole()
			// Read Chunk
			let view = await this.readChunked(size);
			if (view) return view
			// Seeking for the exif at the beginning of the file failed.
			// Fall back to scanning throughout the whole file if allowed.
			if (this.allowWholeFile) return this.readWhole()
		}

		get allowWholeFile() {
			if (this.options.wholeFile === false) return false
			return this.options.wholeFile === true
				|| this.options.wholeFile === undefined
		}

		get forceWholeFile() {
			if (this.allowWholeFile === false) return false
			return this.options.wholeFile === true
				|| this.needWholeFile
		}

		get needWholeFile() {
			return !!this.options.xmp
				|| !!this.options.icc
				|| !!this.options.iptc
		}

		destroy() {}

	}



	class FsReader extends ChunkedReader {

		async readWhole() {
			let fs = await fsPromise;
			let buffer = await fs.readFile(this.input);
			let tiffPosition = findTiff(buffer);
			return [buffer, tiffPosition]
		}

		async readChunk({start, size}) {
			let chunk = Buffer.allocUnsafe(size);
			await this.fh.read(chunk, 0, size, start);
			return chunk
		}

		async readChunked() {
			let fs = await fsPromise;
			this.fh = await fs.open(this.input, 'r');
			try {
				var seekChunk = Buffer.allocUnsafe(this.options.seekChunkSize);
				var {bytesRead} = await this.fh.read(seekChunk, 0, seekChunk.length, null);
				if (!bytesRead) return this.destroy()
				// Try to search for beginning of exif within the first 512 bytes.
				var tiffPosition = findTiff(seekChunk);
				if (tiffPosition && tiffPosition.start && tiffPosition.size) {
					// Exif was found. Allocate appropriately sized buffer and read the whole exif into the buffer.
					// NOTE: does not load the whole file, just exif.
					var tiffChunk = await this.readChunk(tiffPosition);
					//await this.destroy()
					return [tiffChunk, {start: 0}]
				}
				// Close FD/FileHandle since we're using lower-level APIs.
				//await this.destroy()
			} catch(err) {
				// Try to close the FD/FileHandle in any case.
				//await this.destroy()
				throw err
			}
		}

		// TODO: auto close file handle when reading and parsing is over
		// (app can read more chunks after parsing the first)
		async destroy() {
			if (this.fh) {
				await this.fh.close().catch(console.error);
				this.fh = undefined;
			}
		}

	}



	class WebReader extends ChunkedReader {

		async readWhole() {
			let view = await this.readChunk();
			let tiffPosition = findTiff(view);
			return [view, tiffPosition]
		}

		async readChunked(size) {
			let start = 0;
			let end = size;
			let view = await this.readChunk({start, end, size});
			let tiffPosition = findTiff(view);
			if (tiffPosition !== undefined) {
				// Exif was found.
				if (tiffPosition.end > view.byteLength) {
					// Exif was found outside the buffer we alread have.
					// We need to do additional fetch to get the whole exif at the location we found from the first chunk.
					view = await this.readChunk(tiffPosition);
					return [view, {start: 0}]
				} else {
					return [view, tiffPosition]
				}
			}
		}

	}


	function sanitizePosition(position = {}) {
		let {start, size, end} = position;
		if (start === undefined) return {start: 0}
		if (size !== undefined)
			end = start + size;
		else if (end !== undefined)
			size = end - start;
		return {start, size, end}

	}

	class Base64Reader extends WebReader {

		// Accepts base64 or base64 URL and converts it to DataView and trims if needed.
		readChunk(position) {
			let {start, end} = sanitizePosition(position);
			// Remove the mime type and base64 marker at the beginning so that we're left off with clear b64 string.
			let base64 = this.input.replace(/^data\:([^\;]+)\;base64,/gmi, '');
			if (hasBuffer) {
				// TODO: Investigate. this might not work if bundled Buffer is used in browser.
				// the slice/subarray shared memory viewed through DataView problem
				var arrayBuffer = Buffer
					.from(base64, 'base64')
					.slice(start, end)
					.buffer;
			} else {
				var offset = 0;
				// NOTE: Each 4 character block of base64 string represents 3 bytes of data.
				if (start !== undefined || end !== undefined) {
					if (start === undefined) {
						var blockStart = start = 0;
					} else {
						var blockStart = Math.floor(start / 3) * 4;
						offset = start - ((blockStart / 4) * 3);
					}
					if (end === undefined) {
						var blockEnd = base64.length;
						end = (blockEnd / 4) * 3;
					} else {
						var blockEnd = Math.ceil(end / 3) * 4;
					}
					base64 = base64.slice(blockStart, blockEnd);
					var targetSize = end - start;
				} else {
					var targetSize = (base64.length / 4) * 3;
				}
				var binary = atob(base64);
				var arrayBuffer = new ArrayBuffer(targetSize);
				var uint8arr = new Uint8Array(arrayBuffer);
				for (var i = 0; i < targetSize; i++)
					uint8arr[i] = binary.charCodeAt(offset + i);
			}
			return new DataView(arrayBuffer)
		}

	}

	class UrlReader extends WebReader {

		async readChunk(position) {
			let {start, end} = sanitizePosition(position);
			let url = this.input;
			let headers = {};
			if (start || end) headers.range = `bytes=${[start, end].join('-')}`;
			let res = await fetch(url, {headers});
			let chunk = new DataView(await res.arrayBuffer());
			return chunk
		}

	}

	class BlobReader extends WebReader {

		readChunk(position) {
			let {start, end} = sanitizePosition(position);
			let blob = this.input;
			if (end) blob = blob.slice(start, end);
			return new Promise((resolve, reject) => {
				let reader = new FileReader();
				reader.onloadend = () => resolve(new DataView(reader.result || new ArrayBuffer(0)));
				reader.onerror = reject;
				reader.readAsArrayBuffer(blob);
			})
		}

	}


	// HELPER FUNCTIONS

	function isBase64Url(string) {
		return string.startsWith('data:')
			|| string.length > 10000 // naive
		//	|| string.startsWith('/9j/') // expects JPG to always start the same
	}

	/**
	 * Comprehensive list of TIFF and Exif tags found on
	 * http://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/EXIF.html
	 */

	const exif = {
		0x0001: 'InteropIndex',
		0x0002: 'InteropVersion',
		0x000B: 'ProcessingSoftware',
		0x00FE: 'SubfileType',
		0x00FF: 'OldSubfileType',
		0x0100: 'ImageWidth',
		0x0101: 'ImageHeight',
		0x0102: 'BitsPerSample',
		0x0103: 'Compression',
		0x0106: 'PhotometricInterpretation',
		0x0107: 'Thresholding',
		0x0108: 'CellWidth',
		0x0109: 'CellLength',
		0x010A: 'FillOrder',
		0x010D: 'DocumentName',
		0x010E: 'ImageDescription',
		0x010F: 'Make',
		0x0110: 'Model',
		0x0111: 'StripOffsets',
		0x0112: 'Orientation',
		0x0115: 'SamplesPerPixel',
		0x0116: 'RowsPerStrip',
		0x0117: 'StripByteCounts',
		0x0118: 'MinSampleValue',
		0x0119: 'MaxSampleValue',
		0x011A: 'XResolution',
		0x011B: 'YResolution',
		0x011C: 'PlanarConfiguration',
		0x011D: 'PageName',
		0x011E: 'XPosition',
		0x011F: 'YPosition',
		0x0120: 'FreeOffsets',
		0x0121: 'FreeByteCounts',
		0x0122: 'GrayResponseUnit',
		0x0123: 'GrayResponseCurve',
		0x0124: 'T4Options',
		0x0125: 'T6Options',
		0x0128: 'ResolutionUnit',
		0x0129: 'PageNumber',
		0x012C: 'ColorResponseUnit',
		0x012D: 'TransferFunction',
		0x0131: 'Software',
		0x0132: 'ModifyDate',
		0x013B: 'Artist',
		0x013C: 'HostComputer',
		0x013D: 'Predictor',
		0x013E: 'WhitePoint',
		0x013F: 'PrimaryChromaticities',
		0x0140: 'ColorMap',
		0x0141: 'HalftoneHints',
		0x0142: 'TileWidth',
		0x0143: 'TileLength',
		0x0144: 'TileOffsets',
		0x0145: 'TileByteCounts',
		0x0146: 'BadFaxLines',
		0x0147: 'CleanFaxData',
		0x0148: 'ConsecutiveBadFaxLines',
		0x014A: 'SubIFD',
		0x014C: 'InkSet',
		0x014D: 'InkNames',
		0x014E: 'NumberofInks',
		0x0150: 'DotRange',
		0x0151: 'TargetPrinter',
		0x0152: 'ExtraSamples',
		0x0153: 'SampleFormat',
		0x0154: 'SMinSampleValue',
		0x0155: 'SMaxSampleValue',
		0x0156: 'TransferRange',
		0x0157: 'ClipPath',
		0x0158: 'XClipPathUnits',
		0x0159: 'YClipPathUnits',
		0x015A: 'Indexed',
		0x015B: 'JPEGTables',
		0x015F: 'OPIProxy',
		0x0190: 'GlobalParametersIFD',
		0x0191: 'ProfileType',
		0x0192: 'FaxProfile',
		0x0193: 'CodingMethods',
		0x0194: 'VersionYear',
		0x0195: 'ModeNumber',
		0x01B1: 'Decode',
		0x01B2: 'DefaultImageColor',
		0x01B3: 'T82Options',
		0x01B5: 'JPEGTables',
		0x0200: 'JPEGProc',
		0x0201: 'ThumbnailOffset',
		0x0202: 'ThumbnailLength',
		0x0203: 'JPEGRestartInterval',
		0x0205: 'JPEGLosslessPredictors',
		0x0206: 'JPEGPointTransforms',
		0x0207: 'JPEGQTables',
		0x0208: 'JPEGDCTables',
		0x0209: 'JPEGACTables',
		0x0211: 'YCbCrCoefficients',
		0x0212: 'YCbCrSubSampling',
		0x0213: 'YCbCrPositioning',
		0x0214: 'ReferenceBlackWhite',
		0x022F: 'StripRowCounts',
		0x02BC: 'ApplicationNotes',
		0x03E7: 'USPTOMiscellaneous',
		0x1000: 'RelatedImageFileFormat',
		0x1001: 'RelatedImageWidth',
		0x1002: 'RelatedImageHeight',
		0x4746: 'Rating',
		0x4747: 'XP_DIP_XML',
		0x4748: 'StitchInfo',
		0x4749: 'RatingPercent',
		0x800D: 'ImageID',
		0x80A3: 'WangTag1',
		0x80A4: 'WangAnnotation',
		0x80A5: 'WangTag3',
		0x80A6: 'WangTag4',
		0x80E3: 'Matteing',
		0x80E4: 'DataType',
		0x80E5: 'ImageDepth',
		0x80E6: 'TileDepth',
		0x827D: 'Model2',
		0x828D: 'CFARepeatPatternDim',
		0x828E: 'CFAPattern2',
		0x828F: 'BatteryLevel',
		0x8290: 'KodakIFD',
		0x8298: 'Copyright',
		0x829A: 'ExposureTime',
		0x829D: 'FNumber',
		0x82A5: 'MDFileTag',
		0x82A6: 'MDScalePixel',
		0x82A7: 'MDColorTable',
		0x82A8: 'MDLabName',
		0x82A9: 'MDSampleInfo',
		0x82AA: 'MDPrepDate',
		0x82AB: 'MDPrepTime',
		0x82AC: 'MDFileUnits',
		0x830E: 'PixelScale',
		0x8335: 'AdventScale',
		0x8336: 'AdventRevision',
		0x835C: 'UIC1Tag',
		0x835D: 'UIC2Tag',
		0x835E: 'UIC3Tag',
		0x835F: 'UIC4Tag',
		0x83BB: 'IPTC-NAA',
		0x847E: 'IntergraphPacketData',
		0x847F: 'IntergraphFlagRegisters',
		0x8480: 'IntergraphMatrix',
		0x8481: 'INGRReserved',
		0x8482: 'ModelTiePoint',
		0x84E0: 'Site',
		0x84E1: 'ColorSequence',
		0x84E2: 'IT8Header',
		0x84E3: 'RasterPadding',
		0x84E4: 'BitsPerRunLength',
		0x84E5: 'BitsPerExtendedRunLength',
		0x84E6: 'ColorTable',
		0x84E7: 'ImageColorIndicator',
		0x84E8: 'BackgroundColorIndicator',
		0x84E9: 'ImageColorValue',
		0x84EA: 'BackgroundColorValue',
		0x84EB: 'PixelIntensityRange',
		0x84EC: 'TransparencyIndicator',
		0x84ED: 'ColorCharacterization',
		0x84EE: 'HCUsage',
		0x84EF: 'TrapIndicator',
		0x84F0: 'CMYKEquivalent',
		0x8546: 'SEMInfo',
		0x8568: 'AFCP_IPTC',
		0x85B8: 'PixelMagicJBIGOptions',
		0x85D8: 'ModelTransform',
		0x8602: 'WB_GRGBLevels',
		0x8606: 'LeafData',
		0x8649: 'PhotoshopSettings',
		0x8769: 'ExifIFDPointer',
		0x8773: 'ICC_Profile',
		0x877F: 'TIFF_FXExtensions',
		0x8780: 'MultiProfiles',
		0x8781: 'SharedData',
		0x8782: 'T88Options',
		0x87AC: 'ImageLayer',
		0x87AF: 'GeoTiffDirectory',
		0x87B0: 'GeoTiffDoubleParams',
		0x87B1: 'GeoTiffAsciiParams',
		0x8822: 'ExposureProgram',
		0x8824: 'SpectralSensitivity',
		0x8825: 'GPSInfoIFDPointer',
		0x8827: 'ISO',
		0x8828: 'Opto-ElectricConvFactor',
		0x8829: 'Interlace',
		0x882A: 'TimeZoneOffset',
		0x882B: 'SelfTimerMode',
		0x8830: 'SensitivityType',
		0x8831: 'StandardOutputSensitivity',
		0x8832: 'RecommendedExposureIndex',
		0x8833: 'ISOSpeed',
		0x8834: 'ISOSpeedLatitudeyyy',
		0x8835: 'ISOSpeedLatitudezzz',
		0x885C: 'FaxRecvParams',
		0x885D: 'FaxSubAddress',
		0x885E: 'FaxRecvTime',
		0x888A: 'LeafSubIFD',
		0x9000: 'ExifVersion',
		0x9003: 'DateTimeOriginal',
		0x9004: 'DateTimeDigitized',
		0x9101: 'ComponentsConfiguration',
		0x9102: 'CompressedBitsPerPixel',
		0x9201: 'ShutterSpeedValue',
		0x9202: 'ApertureValue',
		0x9203: 'BrightnessValue',
		0x9204: 'ExposureBiasValue',
		0x9205: 'MaxApertureValue',
		0x9206: 'SubjectDistance',
		0x9207: 'MeteringMode',
		0x9208: 'LightSource',
		0x9209: 'Flash',
		0x920A: 'FocalLength',
		0x920B: 'FlashEnergy',
		0x920C: 'SpatialFrequencyResponse',
		0x920D: 'Noise',
		0x920E: 'FocalPlaneXResolution',
		0x920F: 'FocalPlaneYResolution',
		0x9210: 'FocalPlaneResolutionUnit',
		0x9211: 'ImageNumber',
		0x9212: 'SecurityClassification',
		0x9213: 'ImageHistory',
		0x9214: 'SubjectArea',
		0x9215: 'ExposureIndex',
		0x9216: 'TIFF-EPStandardID',
		0x9217: 'SensingMethod',
		0x923A: 'CIP3DataFile',
		0x923B: 'CIP3Sheet',
		0x923C: 'CIP3Side',
		0x923F: 'StoNits',
		0x927C: 'MakerNote',
		0x9286: 'UserComment',
		0x9290: 'SubSecTime',
		0x9291: 'SubSecTimeOriginal',
		0x9292: 'SubSecTimeDigitized',
		0x932F: 'MSDocumentText',
		0x9330: 'MSPropertySetStorage',
		0x9331: 'MSDocumentTextPosition',
		0x935C: 'ImageSourceData',
		0x9C9B: 'XPTitle',
		0x9C9C: 'XPComment',
		0x9C9D: 'XPAuthor',
		0x9C9E: 'XPKeywords',
		0x9C9F: 'XPSubject',
		0xA000: 'FlashpixVersion',
		0xA001: 'ColorSpace',
		0xA002: 'PixelXDimension',
		0xA003: 'PixelYDimension',
		0xA004: 'RelatedSoundFile',
		0xA005: 'InteroperabilityIFDPointer',
		0xA20B: 'FlashEnergy',
		0xA20C: 'SpatialFrequencyResponse',
		0xA20D: 'Noise',
		0xA20E: 'FocalPlaneXResolution',
		0xA20F: 'FocalPlaneYResolution',
		0xA210: 'FocalPlaneResolutionUnit',
		0xA211: 'ImageNumber',
		0xA212: 'SecurityClassification',
		0xA213: 'ImageHistory',
		0xA214: 'SubjectLocation',
		0xA215: 'ExposureIndex',
		0xA216: 'TIFF-EPStandardID',
		0xA217: 'SensingMethod',
		0xA300: 'FileSource',
		0xA301: 'SceneType',
		0xA302: 'CFAPattern',
		0xA401: 'CustomRendered',
		0xA402: 'ExposureMode',
		0xA403: 'WhiteBalance',
		0xA404: 'DigitalZoomRatio',
		0xA405: 'FocalLengthIn35mmFormat',
		0xA406: 'SceneCaptureType',
		0xA407: 'GainControl',
		0xA408: 'Contrast',
		0xA409: 'Saturation',
		0xA40A: 'Sharpness',
		0xA40B: 'DeviceSettingDescription',
		0xA40C: 'SubjectDistanceRange',
		0xA420: 'ImageUniqueID',
		0xA430: 'CameraOwnerName',
		0xA431: 'BodySerialNumber',
		0xA432: 'LensSpecification',
		0xA433: 'LensMake',
		0xA434: 'LensModel',
		0xA435: 'LensSerialNumber',
		0xA480: 'GDALMetadata',
		0xA481: 'GDALNoData',
		0xA500: 'Gamma',
		0xAFC0: 'ExpandSoftware',
		0xAFC1: 'ExpandLens',
		0xAFC2: 'ExpandFilm',
		0xAFC3: 'ExpandFilterLens',
		0xAFC4: 'ExpandScanner',
		0xAFC5: 'ExpandFlashLamp',
		0xBC01: 'PixelFormat',
		0xBC02: 'Transformation',
		0xBC03: 'Uncompressed',
		0xBC04: 'ImageType',
		0xBC80: 'ImageWidth',
		0xBC81: 'ImageHeight',
		0xBC82: 'WidthResolution',
		0xBC83: 'HeightResolution',
		0xBCC0: 'ImageOffset',
		0xBCC1: 'ImageByteCount',
		0xBCC2: 'AlphaOffset',
		0xBCC3: 'AlphaByteCount',
		0xBCC4: 'ImageDataDiscard',
		0xBCC5: 'AlphaDataDiscard',
		0xC427: 'OceScanjobDesc',
		0xC428: 'OceApplicationSelector',
		0xC429: 'OceIDNumber',
		0xC42A: 'OceImageLogic',
		0xC44F: 'Annotations',
		0xC4A5: 'PrintIM',
		0xC580: 'USPTOOriginalContentType',
		0xC612: 'DNGVersion',
		0xC613: 'DNGBackwardVersion',
		0xC614: 'UniqueCameraModel',
		0xC615: 'LocalizedCameraModel',
		0xC616: 'CFAPlaneColor',
		0xC617: 'CFALayout',
		0xC618: 'LinearizationTable',
		0xC619: 'BlackLevelRepeatDim',
		0xC61A: 'BlackLevel',
		0xC61B: 'BlackLevelDeltaH',
		0xC61C: 'BlackLevelDeltaV',
		0xC61D: 'WhiteLevel',
		0xC61E: 'DefaultScale',
		0xC61F: 'DefaultCropOrigin',
		0xC620: 'DefaultCropSize',
		0xC621: 'ColorMatrix1',
		0xC622: 'ColorMatrix2',
		0xC623: 'CameraCalibration1',
		0xC624: 'CameraCalibration2',
		0xC625: 'ReductionMatrix1',
		0xC626: 'ReductionMatrix2',
		0xC627: 'AnalogBalance',
		0xC628: 'AsShotNeutral',
		0xC629: 'AsShotWhiteXY',
		0xC62A: 'BaselineExposure',
		0xC62B: 'BaselineNoise',
		0xC62C: 'BaselineSharpness',
		0xC62D: 'BayerGreenSplit',
		0xC62E: 'LinearResponseLimit',
		0xC62F: 'CameraSerialNumber',
		0xC630: 'DNGLensInfo',
		0xC631: 'ChromaBlurRadius',
		0xC632: 'AntiAliasStrength',
		0xC633: 'ShadowScale',
		0xC634: 'DNGPrivateData',
		0xC635: 'MakerNoteSafety',
		0xC640: 'RawImageSegmentation',
		0xC65A: 'CalibrationIlluminant1',
		0xC65B: 'CalibrationIlluminant2',
		0xC65C: 'BestQualityScale',
		0xC65D: 'RawDataUniqueID',
		0xC660: 'AliasLayerMetadata',
		0xC68B: 'OriginalRawFileName',
		0xC68C: 'OriginalRawFileData',
		0xC68D: 'ActiveArea',
		0xC68E: 'MaskedAreas',
		0xC68F: 'AsShotICCProfile',
		0xC690: 'AsShotPreProfileMatrix',
		0xC691: 'CurrentICCProfile',
		0xC692: 'CurrentPreProfileMatrix',
		0xC6BF: 'ColorimetricReference',
		0xC6D2: 'PanasonicTitle',
		0xC6D3: 'PanasonicTitle2',
		0xC6F3: 'CameraCalibrationSig',
		0xC6F4: 'ProfileCalibrationSig',
		0xC6F5: 'ProfileIFD',
		0xC6F6: 'AsShotProfileName',
		0xC6F7: 'NoiseReductionApplied',
		0xC6F8: 'ProfileName',
		0xC6F9: 'ProfileHueSatMapDims',
		0xC6FA: 'ProfileHueSatMapData1',
		0xC6FB: 'ProfileHueSatMapData2',
		0xC6FC: 'ProfileToneCurve',
		0xC6FD: 'ProfileEmbedPolicy',
		0xC6FE: 'ProfileCopyright',
		0xC714: 'ForwardMatrix1',
		0xC715: 'ForwardMatrix2',
		0xC716: 'PreviewApplicationName',
		0xC717: 'PreviewApplicationVersion',
		0xC718: 'PreviewSettingsName',
		0xC719: 'PreviewSettingsDigest',
		0xC71A: 'PreviewColorSpace',
		0xC71B: 'PreviewDateTime',
		0xC71C: 'RawImageDigest',
		0xC71D: 'OriginalRawFileDigest',
		0xC71E: 'SubTileBlockSize',
		0xC71F: 'RowInterleaveFactor',
		0xC725: 'ProfileLookTableDims',
		0xC726: 'ProfileLookTableData',
		0xC740: 'OpcodeList1',
		0xC741: 'OpcodeList2',
		0xC74E: 'OpcodeList3',
		0xC761: 'NoiseProfile',
		0xC763: 'TimeCodes',
		0xC764: 'FrameRate',
		0xC772: 'TStop',
		0xC789: 'ReelName',
		0xC791: 'OriginalDefaultFinalSize',
		0xC792: 'OriginalBestQualitySize',
		0xC793: 'OriginalDefaultCropSize',
		0xC7A1: 'CameraLabel',
		0xC7A3: 'ProfileHueSatMapEncoding',
		0xC7A4: 'ProfileLookTableEncoding',
		0xC7A5: 'BaselineExposureOffset',
		0xC7A6: 'DefaultBlackRender',
		0xC7A7: 'NewRawImageDigest',
		0xC7A8: 'RawToPreviewGain',
		0xC7B5: 'DefaultUserCrop',
		0xEA1C: 'Padding',
		0xEA1D: 'OffsetSchema',
		0xFDE8: 'OwnerName',
		0xFDE9: 'SerialNumber',
		0xFDEA: 'Lens',
		0xFE00: 'KDC_IFD',
		0xFE4C: 'RawFile',
		0xFE4D: 'Converter',
		0xFE4E: 'WhiteBalance',
		0xFE51: 'Exposure',
		0xFE52: 'Shadows',
		0xFE53: 'Brightness',
		0xFE54: 'Contrast',
		0xFE55: 'Saturation',
		0xFE56: 'Sharpness',
		0xFE57: 'Smoothness',
		0xFE58: 'MoireFilter'
	};


	const gps = {
		0x0000: 'GPSVersionID',
		0x0001: 'GPSLatitudeRef',
		0x0002: 'GPSLatitude',
		0x0003: 'GPSLongitudeRef',
		0x0004: 'GPSLongitude',
		0x0005: 'GPSAltitudeRef',
		0x0006: 'GPSAltitude',
		0x0007: 'GPSTimeStamp',
		0x0008: 'GPSSatellites',
		0x0009: 'GPSStatus',
		0x000A: 'GPSMeasureMode',
		0x000B: 'GPSDOP',
		0x000C: 'GPSSpeedRef',
		0x000D: 'GPSSpeed',
		0x000E: 'GPSTrackRef',
		0x000F: 'GPSTrack',
		0x0010: 'GPSImgDirectionRef',
		0x0011: 'GPSImgDirection',
		0x0012: 'GPSMapDatum',
		0x0013: 'GPSDestLatitudeRef',
		0x0014: 'GPSDestLatitude',
		0x0015: 'GPSDestLongitudeRef',
		0x0016: 'GPSDestLongitude',
		0x0017: 'GPSDestBearingRef',
		0x0018: 'GPSDestBearing',
		0x0019: 'GPSDestDistanceRef',
		0x001A: 'GPSDestDistance',
		0x001B: 'GPSProcessingMethod',
		0x001C: 'GPSAreaInformation',
		0x001D: 'GPSDateStamp',
		0x001E: 'GPSDifferential',
		0x001F: 'GPSHPositioningError'
	};


	const valueString = {
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
	};


	const dates = [
		'DateTimeOriginal',
		'DateTimeDigitized',
		'ModifyDate',
		//'GPSDateStamp',
	];


	//https://sno.phy.queensu.ca/~phil/exiftool/TagNames/IPTC.html
	const iptc = {
		15: 'category',
		25: 'keywords',
		55: 'dateCreated',
		80: 'byline',
		85: 'bylineTitle',
		90: 'city',
		95: 'state',
		101: 'country',
		105: 'headline',
		110: 'credit',
		115: 'source',
		116: 'copyright',
		120: 'caption',
		122: 'captionWriter',
	};

	const SIZE_LOOKUP = {
		1: 1, // BYTE      - 8-bit unsigned integer
		2: 1, // ASCII     - 8-bit bytes w/ last byte null
		3: 2, // SHORT     - 16-bit unsigned integer
		4: 4, // LONG      - 32-bit unsigned integer
		5: 8, // RATIONAL  - 64-bit unsigned fraction
		6: 1, // SBYTE     - 8-bit signed integer
		7: 1, // UNDEFINED - 8-bit untyped data
		8: 2, // SSHORT    - 16-bit signed integer
		9: 4, // SLONG     - 32-bit signed integer
		10: 8, // SRATIONAL - 64-bit signed fraction (Two 32-bit signed integers)
		11: 4, // FLOAT,    - 32-bit IEEE floating point
		12: 8, // DOUBLE    - 64-bit IEEE floating point
		// https://sno.phy.queensu.ca/~phil/exiftool/standards.html
		13: 4 // IFD (sometimes used instead of 4 LONG)
	};

	// TODO: disable/enable tags dictionary
	// TODO: public tags dictionary. user can define what he needs and uses 

	const THUMB_OFFSET = 'ThumbnailOffset';
	const THUMB_LENGTH = 'ThumbnailLength';
	const IFD_EXIF     = 'ExifIFDPointer';
	const IFD_INTEROP  = 'InteroperabilityIFDPointer';
	const IFD_GPS      = 'GPSInfoIFDPointer';

	// First argument can be Node's Buffer or Web's DataView instance.
	// Takes chunk of file and tries to find EXIF (it usually starts inside the chunk, but is much larger).
	// Returns location {start, size, end} of the EXIF in the file not the input chunk itself.

	function findAppSegment(buffer, appN, condition, callback, offset = 0) {
		let length = (buffer.length || buffer.byteLength) - 10;
		let nMarkerByte = 0xE0 | appN;
		for (; offset < length; offset++) {
			if (getUint8(buffer, offset) === 0xFF
			 && getUint8(buffer, offset + 1) === nMarkerByte
			 && condition(buffer, offset)) {
			 	if (callback) return callback(buffer, offset)
				let start = offset;
				let size = getUint16(buffer, offset + 2);
				let end = start + size;
				return {start, size, end}
			}
		}
	}



	function findTiff(buffer) {
		// tiff files start with tiff segment without the app segment header
		var marker = getUint16(buffer, 0);
		if (marker === 0x4949 || marker === 0x4D4D) return {start: 0}
		// otherwise find the segment header.
		return findAppSegment(buffer, 1, isExifSegment, getExifSize)
	}

	function isExifSegment(buffer, offset) {
		return getUint32(buffer, offset + 4) === 0x45786966 // 'Exif'
			&& getUint16(buffer, offset + 8) === 0x0000     // followed by '\0'
	}

	function getExifSize(buffer, offset) {
		var start = offset + 10;
		var size = getUint16(buffer, offset + 2);
		var end = start + size;
		return {start, size, end}
	}



	function findXmp(buffer) {
		return findAppSegment(buffer, 1, isXmpSegment, getXmpSize)
	}

	function isXmpSegment(buffer, offset) {
		return getUint32(buffer, offset + 4) === 0x68747470 // 'http'
	}

	function getXmpSize(buffer, offset) {
		var start = offset + 4;
		var size = getUint16(buffer, offset + 2);
		var end = start + size;
		return {start, size, end}
	}


	/*
	// NOTE: This only works with single segment ICC data.
	// TODO: Implement multi-segment parsing.
	// Not implemented for now
	function findIcc(buffer) {
		//return findAppSegment(buffer, 2, isIccSegment, getIccSize)
	}

	function isIccSegment(buffer, offset) {
		// TODO
	}

	function getIccSize(buffer, offset) {
		// TODO
	}
	*/


	// NOTE: This only works with single segment IPTC data.
	// TODO: Implement multi-segment parsing.
	//function findIptc(buffer, offset = 0) {
	//	return findAppSegment(buffer, 13, isIptcSegment, getIptcSize)
	//}

	// NOTE: reverted back to searching by the 38 42 49... bytes, because ID string could change (Photoshop 2.5, Photoshop 3)
	function findIptc(buffer, offset) {
		var length = (buffer.length || buffer.byteLength) - 10;
		for (var offset = 0; offset < length; offset++) {
			if (isIptcSegmentHead(buffer, offset)) {
				// Get the length of the name header (which is padded to an even number of bytes)
				var nameHeaderLength = getUint8(buffer, offset + 7);
				if (nameHeaderLength % 2 !== 0)
					nameHeaderLength += 1;
				// Check for pre photoshop 6 format
				if (nameHeaderLength === 0)
					nameHeaderLength = 4;
				var start = offset + 8 + nameHeaderLength;
				var size = getUint16(buffer, offset + 6 + nameHeaderLength);
				var end = start + size;
				return {start, size, end}
			}
		}
	}

	function isIptcSegmentHead(buffer, offset) {
		return getUint8(buffer, offset)     === 0x38
			&& getUint8(buffer, offset + 1) === 0x42
			&& getUint8(buffer, offset + 2) === 0x49
			&& getUint8(buffer, offset + 3) === 0x4D
			&& getUint8(buffer, offset + 4) === 0x04
			&& getUint8(buffer, offset + 5) === 0x04
	}



	// https://en.wikipedia.org/wiki/JPEG_File_Interchange_Format
	// https://sno.phy.queensu.ca/~phil/exiftool/TagNames/JPEG.html
	// http://dev.exiv2.org/projects/exiv2/wiki/The_Metadata_in_JPEG_files
	// JPG contains SOI, APP1, [APP2, ... APPn], DQT, DHT, and more segments
	// APPn contain metadata about the image in various formats. There can be multiple APPn segments,
	// even multiple segments of the same type.
	// APP1 contains the basic and most important EXIF data.
	// APP2 contains ICC
	// APP13 contains IPTC
	// the main APP1 (the one with EXIF) is often followed by another APP1 with XMP data (in XML format).
	// Structure of APPn (APP1, APP2, APP13, etc...):
	// - First two bytes are the marker FF En (e.g. FF E1 for APP1)
	// - 3rd & 4th bytes are length of the APPn segment
	// - Followed by a few bytes of segment itentification - describing what type of content is there.
	// Structure of TIFF (APP1-EXIF):
	// - FF 01 - marker
	// - xx xx - Size
	// - 45 78 69 66 00 00 / ASCII string 'Exif\0\0'
	// - TIFF HEADER
	// - 0th IFD + value
	// - 1th IFD + value
	// - may contain additional GPS, Interop, SubExif blocks (pointed to from IFD0)
	class ExifParser extends Reader {

		async read(arg) {
			let [buffer, tiffPosition] = await super.read(arg) || [];
			this.buffer = buffer;
			this.tiffPosition = tiffPosition;
		}

		async parse() {
			// return undefined if file has no exif
			if (this.tiffPosition === undefined) return

			if (typeof this.tiffPosition === 'object') {
				this.tiffOffset = this.tiffPosition.start;
				// jpg wraps tiff into app1 segment.
				this.app1Offset = this.tiffOffset - 6;
				if (this.app1Offset <= 0) this.app1Offset = undefined;
			}

			if (this.options.tiff) await this.parseTiff(); // The basic EXIF tags (image, exif, gps)
			if (this.options.xmp)  this.parseXmpSegment();  // Additional XML data (in XML)
			if (this.options.icc)  this.parseIccSegment();  // Image profile
			if (this.options.iptc) this.parseIptcSegment(); // Captions and copyrights

			// close FS file handle just in case it's still open
			if (this.reader) this.reader.destroy();

			let {image, exif, gps, interop, thumbnail, iptc} = this;
			if (this.options.mergeOutput)
				var output = Object.assign({}, image, exif, gps, interop, thumbnail, iptc);
			else
				var output = {image, exif, gps, interop, thumbnail, iptc};
			if (this.xmp) output.xmp = this.xmp;
			// Return undefined rather than empty object if there's no data.
			for (let key in output)
				if (output[key] === undefined)
					delete output[key];
			if (Object.keys(output).length === 0) return
			return output
		}

		// THUMBNAIL buffer of TIFF of APP1 segment
		async extractThumbnail() {
			// return undefined if file has no exif
			if (this.tiffPosition === undefined) return
			if (!this.tiffParsed) await this.parseTiff();
			if (!this.thumbnailParsed) await this.parseThumbnailBlock(true);
			if (this.thumbnail === undefined) return 
			// TODO: replace 'ThumbnailOffset' & 'ThumbnailLength' by raw keys (when tag dict is not included)
			let offset = this.thumbnail[THUMB_OFFSET] + this.tiffOffset;
			let length = this.thumbnail[THUMB_LENGTH];
			let arrayBuffer = this.buffer.buffer;
			let slice = arrayBuffer.slice(offset, offset + length);
			if (typeof Buffer !== 'undefined')
				return Buffer.from(slice)
			else
				return slice
		}

		// .tif files do no have any APPn segments. and usually start right with TIFF header
		// .jpg files can have multiple APPn segments. They always have APP1 whic is a wrapper for TIFF.
		// APP1 includes TIFF formatted values, grouped into IFD blocks (IFD0, Exif, Interop, GPS, IFD1)

		// APP1 HEADER:
		// - FF E1 - segment marker
		// - 2Bytes - segment length
		// - 45 78 69 66 00 00 - string 'Exif\0\0'
		// APP1 CONTENT:
		// - TIFF HEADER (2b byte order, 2b tiff id, 4b offset of ifd1)
		// - IFD0
		// - Exif IFD
		// - Interop IFD
		// - GPS IFD
		// - IFD1

		// We support both jpg and tiff so we're not looking for app1 segment but directly for tiff
		// because app1 in jpg is only container for tiff.
		async parseTiff() {
			if (this.tiffParsed) return
			this.tiffParsed = true;
			// Cancel if the file doesn't contain the segment or if it's damaged.
			// This is not really TIFF segment. rather TIFF wrapped inside APP1 segment.
			if (!this.ensureSegmentPosition('tiff', findTiff, false)) return
			this.parseTiffHeader();
			await this.parseIfd0Block();                                  // APP1 - IFD0
			if (this.options.exif)      await this.parseExifBlock();      // APP1 - EXIF IFD
			if (this.options.gps)       await this.parseGpsBlock();       // APP1 - GPS IFD
			if (this.options.interop)   await this.parseInteropBlock();   // APP1 - Interop IFD
			if (this.options.thumbnail) await this.parseThumbnailBlock(); // APP1 - IFD1
		}

		parseTiffHeader() {
			// Detect endian 11th byte of TIFF (1st after header)
			var byteOrder = getUint16(this.buffer, this.tiffOffset);
			if (byteOrder === 0x4949)
				this.le = true; // little endian
			else if (byteOrder === 0x4D4D)
				this.le = false; // big endian
			else
				throw new Error('Invalid EXIF data: expected byte order marker (0x4949 or 0x4D4D).')

			// Bytes 8 & 9 are expected to be 00 2A.
			if (getUint16(this.buffer, this.tiffOffset + 2, this.le) !== 0x002A)
				throw new Error('Invalid EXIF data: expected 0x002A.')

			this.ifd0Offset = getUint32(this.buffer, this.tiffOffset + 4, this.le);
		}

		async parseIfd0Block() {
			// Read the IFD0 segment with basic info about the image
			// (width, height, maker, model and pointers to another segments)
			if (this.ifd0Offset < 8)
				throw new Error('Invalid EXIF data: IFD0 offset should be less than 8')
			var ifd0 = await this.parseTiffTags(this.tiffOffset + this.ifd0Offset, exif);
			this.image = ifd0;
			//console.log('this.image', this.image)

			// Cancel if the ifd0 is empty (imaged created from scratch in photoshop).
			if (Object.keys(ifd0).length === 0) return

			this.exifOffset    = ifd0[IFD_EXIF];
			this.interopOffset = ifd0[IFD_INTEROP];
			this.gpsOffset     = ifd0[IFD_GPS];

			// IFD0 segment also contains offset pointers to another segments deeper within the EXIF.
			// User doesn't need to see this. But we're sanitizing it only if options.postProcess is enabled.
			if (this.options.postProcess) {
				delete this.image[IFD_EXIF];
				delete this.image[IFD_INTEROP];
				delete this.image[IFD_GPS];
			}
		}

		// EXIF block of TIFF of APP1 segment
		// 0x8769
		async parseExifBlock() {
			if (this.exifOffset === undefined) return
			this.exif = await this.parseTiffTags(this.tiffOffset + this.exifOffset, exif);
		}

		// GPS block of TIFF of APP1 segment
		// 0x8825
		async parseGpsBlock() {
			if (this.gpsOffset === undefined) return
			let gps$1 = this.gps = await this.parseTiffTags(this.tiffOffset + this.gpsOffset, gps);
			// Add custom timestamp property as a mixture of GPSDateStamp and GPSTimeStamp
			if (this.options.postProcess) {
				if (gps$1.GPSDateStamp && gps$1.GPSTimeStamp)
					gps$1.timestamp = reviveDate(gps$1.GPSDateStamp + ' ' + gps$1.GPSTimeStamp);
				if (gps$1 && gps$1.GPSLatitude) {
					gps$1.latitude  = ConvertDMSToDD(...gps$1.GPSLatitude, gps$1.GPSLatitudeRef);
					gps$1.longitude = ConvertDMSToDD(...gps$1.GPSLongitude, gps$1.GPSLongitudeRef);
				}
			}
		}

		// INTEROP block of TIFF of APP1 segment
		// 0xA005
		async parseInteropBlock() {
			if (!this.options.interop) return
			this.interopOffset = this.interopOffset || (this.exif && this.exif[IFD_INTEROP]);
			if (this.interopOffset === undefined) return
			this.interop = await this.parseTiffTags(this.tiffOffset + this.interopOffset, exif);
		}

		// THUMBNAIL block of TIFF of APP1 segment
		// returns boolean "does the file contain thumbnail"
		async parseThumbnailBlock(force = false) {
			if (this.thumbnailParsed) return true
			if (force === false && this.options.mergeOutput) return false
			let ifd0Entries = getUint16(this.buffer, this.tiffOffset + this.ifd0Offset, this.le);
			let temp = this.tiffOffset + this.ifd0Offset + 2 + (ifd0Entries * 12);
			this.ifd1Offset = getUint32(this.buffer, temp, this.le);
			// IFD1 offset is number of bytes from start of TIFF header where thumbnail info is.
			if (this.ifd1Offset === 0) return false
			this.thumbnail = await this.parseTiffTags(this.tiffOffset + this.ifd1Offset, exif);
			this.thumbnailParsed = true;
			return true
		}

		async parseTiffTags(offset, tagNames) {
			// TODO: re-read file if portion of the exif is outside of read chunk
			// (test/001.tif has tiff segment at the beggining plus at the end)
			if (offset > this.buffer.byteLength) {
				if (this.mode === 'chunked') {
					var chunk = await this.reader.readChunk({
						start: offset,
						size: 10000,
					});
					offset = 0;
				} else {
					throw new Error(`segment offset ${offset} is out of chunk size ${this.buffer.byteLength}`)
				}
			} else {
				var chunk = this.buffer;
			}
			var entriesCount = getUint16(chunk, offset, this.le);
			//return
			offset += 2;
			var res = {};
			for (var i = 0; i < entriesCount; i++) {
				var tag = getUint16(chunk, offset, this.le);
				var key = tagNames[tag] || tag;
				var val = this.parseTiffTag(chunk, offset);
				//console.log(`${i} / ${entriesCount} |`, offset, '|', tag, key, val)
				if (this.options.postProcess)
					val = translateValue(key, val);
				res[key] = val;
				offset += 12;
			}
			return res
		}

		parseTiffTag(chunk, offset) {
			var type = getUint16(chunk, offset + 2, this.le);
			var valuesCount = getUint32(chunk, offset + 4, this.le);
			var valueByteSize = SIZE_LOOKUP[type];
			if (valueByteSize * valuesCount <= 4)
				var valueOffset = offset + 8;
			else
				var valueOffset = this.tiffOffset + getUint32(chunk, offset + 8, this.le);

			if (valueOffset > chunk.buffer.byteLength)
				throw new Error(`tiff value offset ${valueOffset} is out of chunk size ${chunk.buffer.byteLength}`)

			// ascii strings, array of 8bits/1byte values.
			if (type === 2) {
				var end = valueOffset + valuesCount;
				var string = toString(chunk, valueOffset, end);
				if (string.endsWith('\0')) // remove null terminator
					return string.slice(0, -1)
				return string
			}

			// undefined/buffers of 8bit/1byte values.
			if (type === 7)
				return slice(chunk, valueOffset, valueOffset + valuesCount)

			// Now that special cases are solved, we can return the normal uint/int value(s).
			if (valuesCount === 1) {
				// Return single value.
				return this.parseTiffTagValue(chunk, valueOffset, type)
			} else {
				// Return array of values.
				var res = [];
				for (var i = 0; i < valuesCount; i++) {
					res.push(this.parseTiffTagValue(chunk, valueOffset, type));
					valueOffset += valueByteSize;
				}
				return res
			}
		}

		parseTiffTagValue(chunk, offset, type) {
			switch (type) {
				case 1:  return getUint8(chunk, offset)
				case 3:  return getUint16(chunk, offset, this.le)
				case 4:  return getUint32(chunk, offset, this.le)
				case 5:  return getUint32(chunk, offset, this.le) / getUint32(chunk, offset + 4, this.le)
				case 6:  return getInt8(chunk, offset)
				case 8:  return getInt16(chunk, offset, this.le)
				case 9:  return getInt32(chunk, offset, this.le)
				case 10: return getInt32(chunk, offset, this.le) / getInt32(chunk, offset + 4, this.le)
				//case 11: return getFloat()  // TODO: buffer.readFloatBE() buffer.readFloatLE()
				//case 12: return getDouble() // TODO: buffer.readDoubleBE() buffer.readDoubleLE()
				case 13: return getUint32(chunk, offset, this.le)
				default: throw new Error(`Invalid tiff type ${type}`)
			}
		}


		parseXmpSegment() {
			// Cancel if the file doesn't contain the segment or if it's damaged.
			if (!this.ensureSegmentPosition('xmp', findXmp)) return

			// Read XMP segment as string. We're not parsing the XML.
			this.xmp = toString(this.buffer, this.xmpOffset, this.xmpOffset + this.xmpEnd);

			// Trims the mess around.
			if (this.options.postProcess) {
				let start = this.xmp.indexOf('<x:xmpmeta');
				let end = this.xmp.indexOf('x:xmpmeta>') + 10;
				this.xmp = this.xmp.slice(start, end);
				// offer user to supply custom xml parser
				if (this.parseXml) this.xmp = this.parseXml(this.xmp);
			}
		}


		// Not currently implemented.
		parseIccSegment() {
		}

		// NOTE: This only works with single segment IPTC data.
		// TODO: Implement multi-segment parsing.
		parseIptcSegment() {
			// Cancel if the file doesn't contain the segment or if it's damaged.
			if (!this.ensureSegmentPosition('iptc', findIptc)) return

			// Parse each value in the buffer into key:value pair.
			this.iptc = {};
			var offset = this.iptcOffset;
			for (var offset = 0; offset < this.iptcEnd; offset++) {
				if (getUint8(this.buffer, offset) === 0x1C && getUint8(this.buffer, offset + 1) === 0x02) {
					let size = getInt16(this.buffer, offset + 3);
					let tag = getUint8(this.buffer, offset + 2);
					let key = iptc[tag] || tag;
					let val = toString(this.buffer, offset + 5, offset + 5 + size);
					this.iptc[key] = setValueOrArrayOfValues(val, this.iptc[key]);
				}
			}
		}

		ensureSegmentPosition(name, finder, requireEnd = true) {
			var OFFSET = name + 'Offset';
			var END = name + 'End';
			if (this[OFFSET] === undefined || (requireEnd && this[END] === undefined)) {
				let position = finder(this.buffer/*, this.baseOffset*/);
				if (position === undefined) return false
				this[OFFSET] = position.start;
				this[END]    = position.end;
			}
			// Cancel if the file doesn't contain the segment or if it's damaged.
			if (this[OFFSET] === undefined || (requireEnd && this[END] === undefined)) return false
			// Otherwise we're good to go
			return true
		}

	}


	// Converts date string to Date instances, replaces enums with string descriptions
	// and fixes values that are incorrectly treated as buffers.
	function translateValue(key, val) {
		if (val === undefined || val === null)
			return undefined
		if (dates.includes(key))
			return reviveDate(val)
		if (key === 'SceneType')
			return Array.from(val).map(v => valueString.SceneType[v]).join(', ')
		if (key === 'ComponentsConfiguration')
			return Array.from(val).map(v => valueString.Components[v]).join(', ')
		if (valueString[key] !== undefined)
			return valueString[key][val] || val
		if (key === 'FlashpixVersion' || key === 'ExifVersion')
			return toString(val)
		if (key === 'GPSVersionID')
			return Array.from(val).join('.')
		if (key === 'GPSTimeStamp')
			return Array.from(val).join(':')
		return val
	}

	function reviveDate(string) {
		if (typeof string !== 'string')
			return null
		string = string.trim();
		var [dateString, timeString] = string.split(' ');
		var [year, month, day] = dateString.split(':').map(Number);
		var date = new Date(year, month - 1, day);
		if (timeString) {
			var [hours, minutes, seconds] = timeString.split(':').map(Number);
			date.setHours(hours);
			date.setMinutes(minutes);
			date.setSeconds(seconds);
		}
		return date
	}

	function setValueOrArrayOfValues(newValue, existingValue) {
		if (existingValue !== undefined) {
			if (existingValue instanceof Array) {
				existingValue.push(newValue);
				return existingValue
			} else {
				return [existingValue, newValue]
			}
		} else {
			return newValue
		}
	}

	function ConvertDMSToDD(degrees, minutes, seconds, direction) {
		var dd = degrees + (minutes / 60) + (seconds / (60*60));
		// Don't do anything for N or E
		if (direction == 'S' || direction == 'W')
			dd *= -1;
		return dd
	}

	async function parse(arg, options) {
		let parser = new ExifParser(options);
		await parser.read(arg);
		if (parser.tiffPosition === undefined) return
		return parser.parse()
	}

	async function thumbnailBuffer(arg, options = {}) {
		let parser = new ExifParser(options);
		await parser.read(arg);
		if (parser.tiffPosition === undefined) return
		return parser.extractThumbnail()
	}

	async function thumbnailUrl(...args) {
		let arrayBuffer = await thumbnailBuffer(...args);
		if (arrayBuffer !== undefined) {
			let blob = new Blob([arrayBuffer]);
			return URL.createObjectURL(blob)
		}
	}

	exports.ExifParser = ExifParser;
	exports.defaultOptions = defaultOptions;
	exports.parse = parse;
	exports.thumbnailBuffer = thumbnailBuffer;
	exports.thumbnailUrl = thumbnailUrl;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
