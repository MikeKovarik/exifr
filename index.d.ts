/// <reference types="node" />

export as namespace exifr;

interface Tags {
	[name: string]: string | number | number[] | Uint8Array
}

type Input = ArrayBuffer | SharedArrayBuffer | Buffer | Uint8Array | DataView | string | Blob | File | HTMLImageElement

type Filter = (string | number)[];

interface GpsOutput {
	latitude: number,
	longitude: number,
}

interface FormatOptions {
	skip?: Filter,
	pick?: Filter,
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

export function parse(data: Input, options?: Options | Filter): Promise<any>;
export function thumbnail(data: Input): Promise<Uint8Array | Buffer | undefined>;
export function thumbnailUrl(data: Input): Promise<string>;
export function gps(data: Input): Promise<GpsOutput>;
export function orientation(data: Input): Promise<number | undefined>;

export const tagKeys:     Map<string, Map<number, string>>;
export const tagValues:   Map<string, Map<number, any>>;
export const tagRevivers: Map<string, Map<number, any>>;

export const fileParsers:    Map<string, any>;
export const segmentParsers: Map<string, any>;
export const fileReaders:    Map<string, any>;

export class Exifr {
	constructor(options?: Options);
	read(data: Input): Promise<void>;
	parse(): Promise<any>;
	extractThumbnail(): Promise<Uint8Array | undefined>;
}

declare const _default: {
	parse:        typeof parse;
	thumbnail:    typeof thumbnail;
	thumbnailUrl: typeof thumbnailUrl;
	gps:          typeof gps;
	orientation:  typeof orientation;

	tagKeys:      typeof tagKeys;
	tagValues:    typeof tagValues;
	tagRevivers:  typeof tagRevivers;

	fileParsers:    typeof fileParsers;
	segmentParsers: typeof segmentParsers;
	fileReaders:    typeof fileReaders;

	Exifr: Exifr;
}

export default _default