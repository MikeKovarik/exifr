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
	parse?: boolean, // XMP only
	multiSegment?: boolean, // XMP and icc only
}

interface Options extends FormatOptions {
	// TIFF segment IFD blocks
	tiff?: FormatOptions | boolean,
	ifd0?: FormatOptions, // cannot be disabled. 
	ifd1?: FormatOptions | boolean,
	exif?: FormatOptions | boolean,
	gps?: FormatOptions | boolean,
	interop?: FormatOptions | boolean,
	// notable properties in TIFF
	makerNote?: boolean,
	userComment?: boolean,
	// Other segments
	xmp?: FormatOptions | boolean,
	icc?: FormatOptions | boolean,
	iptc?: FormatOptions | boolean,
	// JPEG only segment
	jfif?: FormatOptions | boolean,
	// PNG only only segment
	ihdr?: FormatOptions | boolean,
	// other options
	sanitize?: boolean,
	mergeOutput?: boolean,
	firstChunkSize?: number,
	chunkSize?: number,
	chunkLimit?: number,
}

interface IRotation {
	deg: number;
	rad: number;
	scaleX: number;
	scaleY: number;
	dimensionSwapped: boolean;
	css: boolean;
	canvas: boolean;
}

export function parse(data: Input, options?: Options | Filter | boolean): Promise<any>;
export function gps(data: Input): Promise<GpsOutput>;
export function orientation(data: Input): Promise<number | undefined>;
export function rotation(data: Input): Promise<IRotation | undefined>;
export function thumbnail(data: Input): Promise<Uint8Array | Buffer | undefined>;
export function thumbnailUrl(data: Input): Promise<string | undefined>;
export function sidecar(data: Input, options?: Options, type?: string): Promise<object | undefined>;

export const rotations:    {[index: number]: IRotation};
export const rotateCanvas: boolean;
export const rotateCss:    boolean;

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
	gps:          typeof gps;
	orientation:  typeof orientation;
	rotation:     typeof rotation;
	thumbnail:    typeof thumbnail;
	thumbnailUrl: typeof thumbnailUrl;
	sidecar:      typeof sidecar;

	rotations:    typeof rotations;
	rotateCanvas: typeof rotateCanvas;
	rotateCss:    typeof rotateCss;

	tagKeys:      typeof tagKeys;
	tagValues:    typeof tagValues;
	tagRevivers:  typeof tagRevivers;

	fileParsers:    typeof fileParsers;
	segmentParsers: typeof segmentParsers;
	fileReaders:    typeof fileReaders;

	Exifr: Exifr;
}

export default _default
