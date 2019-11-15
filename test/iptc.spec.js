import {assert} from './test-util.js'
import {getFile, testSegment, testSegmentTranslation, testImage} from './test-util.js'


describe('IPTC Segment', () => {

	testSegment({
		key: 'iptc',
		fileWith: 'Bush-dog.jpg',
		fileWithout: 'IMG_20180725_163423.jpg',
		definedByDefault: false
	})

	testSegmentTranslation({
		type: 'iptc',
		file: 'Bush-dog.jpg',
		tags: [
			[
				105, 'headline',
			], [
				110, 'credit',
			],
		]
	})

	testImage('iptc', 'Bush-dog.jpg', {
		credit: 'AP',
		headline: 'BUSH',
	})

	testImage('iptc', 'iptc-agency-photographer-example.jpg', {
		// this does not represent all IPTC data in the file
		dateCreated: '20090624',
		byline: 'Julie Doe',
		bylineTitle: 'Mugwum contract photographer',
		city: 'Washington',
		state: 'District of Columbia',
		country: 'United States of America',
		headline: 'Lincoln Memorial',
		credit: 'Mugwum Press',
		source: 'Julie Doe / Mugwum Press',
	})

	testImage('iptc', 'iptc-independent-photographer-example.jpg', {
		// this does not represent all IPTC data in the file
		dateCreated: '19851125',
		byline: 'David Riecks',
		bylineTitle: 'Photographer',
		city: 'Nainital',
		state: 'Uttarakhand',
		country: 'India',
		headline: 'Southern Himalayan Mountains.',
		credit: '�1985 David Riecks: www.riecks.c',
		source: 'David Riecks Photography',
		copyright: '�1985 David Riecks, All Rights Reserved',
		captionWriter: 'David Riecks'
	})

	testImage('iptc', 'iptc-staff-photographer-example.jpg', {
		// this does not represent all IPTC data in the file
		dateCreated: '20070419',
		byline: 'John Doe',
		bylineTitle: 'Staff Photographer',
		city: 'Watseka',
		state: 'Illinois',
		country: 'United States',
		headline: 'Farmer planting onions',
		credit: 'Big Newspaper',
		source: 'John Doe / Big Newspaper',
		copyright: '�2010 Big Newspaper, all rights reserved',
		captionWriter: 'Susan Brown'
	})

	testImage('iptc', 'BonTonARTSTORplusIPTC.jpg', {
		// this does not represent all IPTC data in the file
		headline: 'Do you know your lesson?: Tailored ensembles imagined by Jeanne Lanvin',
		byline: 'Allan Kohl',
		credit: 'Allan Kohl; Minneapolis College of Art & Design Visual Resource Collection',
		source: 'Core 4 Sample Database (VCat)',
		dateCreated: '20071119',
		// ... and then there's more data like keywords array
	})

	testImage('iptc', 'issue-fast-exif-2.jpg', {
		dateCreated: '20170506',
		byline: 'FRPASSAQUAY'
	})

})