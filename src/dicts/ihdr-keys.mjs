import {tagKeys, createDictionary} from '../tags.mjs'



// PNG Header Tags
// the number is not a tag code but an offset in buffer (standard png header)
// so there's no missing 1,2,3,5,6,7, etc... tag
createDictionary(tagKeys, 'ihdr', [
    [0, 'ImageWidth'],
    [4, 'ImageHeight'],
    [8, 'BitDepth'],
    [9, 'ColorType'],
    [10, 'Compression'],
    [11, 'Filter'],
    [12, 'Interlace'],
])