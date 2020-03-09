import {tagKeys, createDictionary} from '../tags.mjs'


// inspired by
// https://exiftool.org/TagNames/EXIF.html
// http://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/EXIF.html
// https://metacpan.org/pod/distribution/Image-ExifTool/lib/Image/ExifTool/TagNames.pod#EXIF-Tags
// https://metacpan.org/pod/Image::MetaData::JPEG::TagLists - canonical + custom tags

createDictionary(tagKeys, ['ifd0', 'ifd1'], [
	// most of these plus more https://metacpan.org/pod/Image::MetaData::JPEG::TagLists#Canonical-Exif-2.2-and-TIFF-6.0-tags-for-IFD0-and-IFD1
	[0x0100, 'ImageWidth'],
	[0x0101, 'ImageHeight'],
	[0x0102, 'BitsPerSample'],
	[0x0103, 'Compression'],
	[0x0106, 'PhotometricInterpretation'],
	[0x010e, 'ImageDescription'],
	[0x010f, 'Make'],
	[0x0110, 'Model'],
	[0x0111, 'StripOffsets'], // PreviewImageStart
	[0x0112, 'Orientation'],
	[0x0115, 'SamplesPerPixel'],
	[0x0116, 'RowsPerStrip'],
	[0x0117, 'StripByteCounts'], // PreviewImageLength
	[0x011a, 'XResolution'],
	[0x011b, 'YResolution'],
	[0x011c, 'PlanarConfiguration'],
	[0x0128, 'ResolutionUnit'],
	[0x012d, 'TransferFunction'],
	[0x0131, 'Software'],
	[0x0132, 'ModifyDate'],
	[0x013b, 'Artist'],
	[0x013c, 'HostComputer'],
	[0x013d, 'Predictor'],
	[0x013e, 'WhitePoint'],
	[0x013f, 'PrimaryChromaticities'],
	[0x0201, 'ThumbnailOffset'],
	[0x0202, 'ThumbnailLength'],
	[0x0211, 'YCbCrCoefficients'],
	[0x0212, 'YCbCrSubSampling'],
	[0x0213, 'YCbCrPositioning'],
	[0x0214, 'ReferenceBlackWhite'],
	[0x02bc, 'ApplicationNotes'], // [Adobe XMP technote 9-14-02]
	[0x8298, 'Copyright'],
	// not core, but useful
	[0x83bb, 'IPTC'],
	[0x8769, 'ExifIFD'],
	[0x8773, 'ICC'],
	[0x8825, 'GpsIFD'],
	[0x014a, 'SubIFD'], // [Adobe TIFF technote 1]
	[0xa005, 'InteropIFD'], // not actually assigned to IFD0 but offten found here
	// descriptions, not core
	[0x9c9b, 'XPTitle'],
	[0x9c9c, 'XPComment'],
	[0x9c9d, 'XPAuthor'],
	[0x9c9e, 'XPKeywords'],
	[0x9c9f, 'XPSubject'],
])