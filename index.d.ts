/// <reference types="node" />

export as namespace Exifr

interface Tags {
	[name: string]: String | Number | Number[] | Uint8Array
}

type Input = ArrayBuffer | SharedArrayBuffer | Buffer | Uint8Array | DataView | string

type Output = Tags | ExpandedTags

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
	gps?: Tags,
	interop?: Tags,
	thumbnail?: Tags,
	// Other segments
	jfif?: Tags,
	iptc?: Tags,
	xmp?: Tags,
	icc?: Tags
}

export function parse(data: Input, options?: Options): ExpandedTags;