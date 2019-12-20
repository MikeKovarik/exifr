/// <reference types="node" />

export as namespace Exifr

interface Tags {
	[name: string]: String | Number | Number[] | Uint8Array
}

type Input = ArrayBuffer | SharedArrayBuffer | Buffer | Uint8Array | DataView | string

type Output = Tags | ExpandedTags

interface GpsOutput {
	latitude: number,
	longitude: number,
}

interface FormatOptions {
	skip?: string[] | number[],
	pick?: string[] | number[],
	translateKeys?: boolean,
	translateValues?: boolean,
	reviveValues?: boolean,
}

interface Options extends FormatOptions {
	// TIFF segment
	tiff?: FormatOptions | boolean,
	ifd0?: FormatOptions, // cannot be disabled. 
	exfif?: FormatOptions | boolean,
	gps?: FormatOptions | boolean,
	interop?: FormatOptions | boolean,
	thumbnail?: FormatOptions | boolean,
	// Other segments
	jfif?: FormatOptions | boolean,
	iptc?: FormatOptions | boolean,
	xmp?: FormatOptions | boolean,
	icc?: FormatOptions | boolean,
	// other options
	mergeOutput?: boolean
}

interface ExpandedTags {
	// TIFF segment
	ifd0?: Tags,
	exif?: Tags,
	gps?: Tags & GpsOutput,
	interop?: Tags,
	thumbnail?: Tags,
	// Other segments
	jfif?: Tags,
	iptc?: Tags,
	xmp?: Tags,
	icc?: Tags
}

class SegmentParser {
	parse(): Promise<any>;
}

export default class Exifr {
	static parse(data: Input, options?: Options): Promise<ExpandedTags>;
	static thumbnail(data: Input, options?: Options): Promise<Uint8Array | Buffer | undefined>;
	static thumbnailUrl(data: Input, options?: Options): Promise<string>;
	static gps(data: Input): Promise<GpsOutput>;
	constructor(options?: Options);
	read(data: Input): Promise<void>;
	parse(): Promise<Output>;
	extractThumbnail(): Promise<Uint8Array | undefined>;
	static segmentParsers: Map<string, SegmentParser>
}


/*
/// <reference types="node" />

declare module "exifr" {

	interface Tags {
		[name: string]: String | Number | Number[] | Uint8Array
	}

	class Exifr {
		static parse(data: Uint8Array): Promise<Tags>;
		static segmentParsers: Map<string, string>
	}

	export = Exifr

}
*/