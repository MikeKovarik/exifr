import {tags} from '../tags.js'



/*
missing:
  '0': '\u0000\u0002',
  '5': 'drp2091169d',
  '10': '1',
  '40': 'Newsmagazines Out',
  '92': 'Lincoln Memorial',
  '103': 'Honest Abe',
  '0': '\u0000\u0002',
  '5': 'drpin075402',
  '40': 'No usage or third party sales granted without prior permission.',
  '92': 'Snow Peak',
  '103': 'Sacred India',
  '0': '\u0000\u0002',
  '5': '01661gdx',
  '10': '1',
  '40': 'Newspapers Out, Original Artixscan 4000 of color negative ' +
    'file, 160 ISO (frame 35a) is 7.6 x 11.2 at 500ppi, in Adobe ' +
    'RGB.',
  '60': '110315-0600',
  '92': 'Moore family farm',
  '103': 'CSA farms',
  '0': '\u0000\u0004',
  '60': '152407',
  '62': '20170506',
  '63': '152407',
*/

// https://sno.phy.queensu.ca/~phil/exiftool/TagNames/IPTC.html
tags.iptc = {
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
}