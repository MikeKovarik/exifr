import {tagValues, createDictionary} from '../tags.mjs'


// Taken from
// https://exiftool.org/TagNames/IPTC.html

createDictionary(tagValues, 'iptc', [

    [10, {
        0: '0 (reserved)',
        1: '1 (most urgent)',
        2: '2',
        3: '3',
        4: '4',
        5: '5 (normal urgency)',
        6: '6',
        7: '7',
        8: '8 (least urgent)',
        9: '9 (user-defined priority)',
    }],

    // TODO 42

    [75, {
        'a': 'Morning',
        'b': 'Both Morning and Evening',
        'p': 'Evening',
    }],

    [131, {
        'L': 'Landscape',
        'P': 'Portrait',
        'S': 'Square',
    }],

	// not useful in images

/*
    [150, {
        '0T': 'Text Only',
        '1A': 'Mono Actuality',
        '1C': 'Mono Question and Answer Session',
        '1M': 'Mono Music',
        '1Q': 'Mono Response to a Question',
        '1R': 'Mono Raw Sound',
        '1S': 'Mono Scener',
        '1V': 'Mono Voicer',
        '1W': 'Mono Wrap',
        '2A': 'Stereo Actuality',
        '2C': 'Stereo Question and Answer Session',
        '2M': 'Stereo Music',
        '2Q': 'Stereo Response to a Question',
        '2R': 'Stereo Raw Sound',
        '2S': 'Stereo Scener',
        '2V': 'Stereo Voicer',
        '2W': 'Stereo Wrap',
    }],

    [200, {
        0: 'No ObjectData',
        1: 'IPTC-NAA Digital Newsphoto Parameter Record',
        2: 'IPTC7901 Recommended Message Format',
        3: 'Tagged Image File Format (Adobe/Aldus Image data)',
        4: 'Illustrator (Adobe Graphics data)',
        5: 'AppleSingle (Apple Computer Inc)',
        6: 'NAA 89-3 (ANPA 1312)',
        7: 'MacBinary II',
        8: 'IPTC Unstructured Character Oriented File Format (UCOFF)',
        9: 'United Press International ANPA 1312 variant',
        10: 'United Press International Down-Load Message',
        11: 'JPEG File Interchange (JFIF)',
        12: 'Photo-CD Image-Pac (Eastman Kodak)',
        13: 'Bit Mapped Graphics File [.BMP] (Microsoft)',
        14: 'Digital Audio File [.WAV] (Microsoft & Creative Labs)',
        15: 'Audio plus Moving Video [.AVI] (Microsoft)',
        16: 'PC DOS/Windows Executable Files [.COM][.EXE]',
        17: 'Compressed Binary File [.ZIP] (PKWare Inc)',
        18: 'Audio Interchange File Format AIFF (Apple Computer Inc)',
        19: 'RIFF Wave (Microsoft Corporation)',
        20: 'Freehand (Macromedia/Aldus)',
        21: 'Hypertext Markup Language [.HTML] (The Internet Society)',
        22: 'MPEG 2 Audio Layer 2 (Musicom), ISO/IEC',
        23: 'MPEG 2 Audio Layer 3, ISO/IEC',
        24: 'Portable Document File [.PDF] Adobe',
        25: 'News Industry Text Format (NITF)',
        26: 'Tape Archive [.TAR]',
        27: 'Tidningarnas Telegrambyra NITF version (TTNITF DTD)',
        28: 'Ritzaus Bureau NITF version (RBNITF DTD)',
        29: 'Corel Draw [.CDR]',
    }],
*/
])