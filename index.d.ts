/// <reference types="node" />

export as namespace Exifr

interface Tags {
	[name: string]: String | Number | Number[] | Uint8Array
}

type Input = ArrayBuffer | SharedArrayBuffer | Buffer | Uint8Array | DataView | string | Blob | File

type Output = Tags | ExpandedTags

interface GpsOutput {
	latitude: number,
	longitude: number,
}

interface FormatOptions {
	skip?: (string | number)[],
	pick?: (string | number)[],
	translateKeys?: boolean,
	translateValues?: boolean,
	reviveValues?: boolean,
}

interface Options extends FormatOptions {
	// TIFF segment
	tiff?: FormatOptions | boolean,
	ifd0?: FormatOptions, // cannot be disabled. 
	ifd1?: FormatOptions | boolean,
	exfif?: FormatOptions | boolean,
	gps?: FormatOptions | boolean,
	interop?: FormatOptions | boolean,
	// Other segments
	jfif?: FormatOptions | boolean,
	iptc?: FormatOptions | boolean,
	xmp?: FormatOptions | boolean,
	icc?: FormatOptions | boolean,
	makerNote?: boolean,
	userComment?: boolean,
	// other options
	sanitize?: boolean,
	mergeOutput?: boolean,
	firstChunkSize?: number,
	chunkSize?: number,
	chunkLimit?: number,
}

interface ExpandedTags {
	// TIFF segment
	ifd0?: Tags,
	ifd1?: Tags,
	exif?: Tags,
	gps?: Tags & GpsOutput,
	interop?: Tags,
	// Other segments
	jfif?: Tags,
	iptc?: Tags,
	xmp?: Tags,
	icc?: Tags
}

export function parse(data: Input, options?: Options): Promise<ExpandedTags>;
export function thumbnail(data: Input, options?: Options): Promise<Uint8Array | Buffer | undefined>;
export function thumbnailUrl(data: Input, options?: Options): Promise<string>;
export function gps(data: Input): Promise<GpsOutput>;

export var tagKeys: Map<string, Map<number, string>>;
export var tagValues: Map<string, Map<number, any>>;
export var tagRevivers: Map<string, Map<number, any>>;

export var fileParsers: Map<string, any>;
export var segmentParsers: Map<string, any>;
export var fileReaders: Map<string, any>;

export class Exifr {
	constructor(options?: Options);
	read(data: Input): Promise<void>;
	parse(): Promise<Output>;
	extractThumbnail(): Promise<Uint8Array | undefined>;
}