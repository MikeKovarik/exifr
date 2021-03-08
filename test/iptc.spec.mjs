import {assert, assertOutputWithoutErrors} from './test-util-core.mjs'
import {getFile} from './test-util-core.mjs'
import {testSegment, testMergeSegment, testSegmentTranslation, testImage} from './test-util-suites.mjs'
import {Exifr} from '../src/bundles/full.mjs'
import * as exifr from '../src/bundles/full.mjs'


describe('IPTC Segment', () => {

	it(`#41 - APP13 Without IPTC should be discarded and not throw error`, async () => {
		let options = {iptc: true, xmp: false}
		let buffer = await getFile(`issue-exifr-41-Error_Segment_Unreachable.jpg`)
		let output = await exifr.parse(buffer, options)
		assertOutputWithoutErrors(output)
	})

	it(`#47 - Handles special unicode characters`, async () => {
		let input = await getFile('issue-exifr-47.jpeg')
		var output = await exifr.parse(input, true)
		assert.equal(output.BylineTitle, '[Lerakják a síneket a Hatvani utcában]')
		assert.equal(output.Keywords.slice(0, 154), 'Budapest. 5. kerület. Kossuth Lajos utca ; Budapest. 5. kerület. Szabad sajtó út 5-6. ; Budapest. 5. kerület. Március 15. tér. Belvárosi Fõplébániatemplom')
	})

	describe('options.iptc enable/disable', () => {
		testSegment({
			key: 'iptc',
			fileWith: 'Bush-dog.jpg',
			fileWithout: 'IMG_20180725_163423.jpg',
			definedByDefault: false
		})
	})

	testMergeSegment({
		key: 'iptc',
		file: 'Bush-dog.jpg',
		properties: ['Headline', 'Credit']
	})

	// we won't bother implementing this for now. its way to insignificant of a use.
	//testPickOrSkipTags('iptc', 'iptc-agency-photographer-example.jpg', [80, 'dateCreated'], [101, 'headline'])

	testSegmentTranslation({
		type: 'iptc',
		file: 'Bush-dog.jpg',
		tags: [
			[
				105, 'Headline',
			], [
				110, 'Credit',
			],
		]
	})

	testImage('iptc', 'Bush-dog.jpg', {
		ObjectName: 'BUSH',
		Category: 'A',
		DateCreated: '20030830',
		TimeCreated: '000000',
		Byline: 'DUANE A. LAVERTY',
		BylineTitle: 'STR',
		City: 'WACO',
		State: 'TX',
		Country: 'USA',
		OriginalTransmissionReference: 'TXDL102',
		Headline: 'BUSH',
		Credit: 'AP',
		Source: 'AP',
	})

	it(`keywords is array`, async () => {
		let options = {mergeOutput: false, iptc: true}
		let input = await getFile('iptc-agency-photographer-example.jpg')
		let output = await exifr.parse(input, options) || {}
		assert.isArray(output.iptc.Keywords)
	})

	testImage('iptc', 'iptc-agency-photographer-example.jpg', {
		// this does not represent all IPTC data in the file
		SpecialInstructions: 'Newsmagazines Out',
		DateCreated: '20090624',
		Byline: 'Julie Doe',
		BylineTitle: 'Mugwum contract photographer',
		City: 'Washington',
		Sublocation: 'Lincoln Memorial',
		State: 'District of Columbia',
		Country: 'United States of America',
		OriginalTransmissionReference: 'Honest Abe',
		Headline: 'Lincoln Memorial',
		Credit: 'Mugwum Press',
		Source: 'Julie Doe / Mugwum Press',
	})

	testImage('iptc', 'iptc-independent-photographer-example.jpg', {
		// this does not represent all IPTC data in the file
		ObjectName: 'drpin075402',
		SpecialInstructions: 'No usage or third party sales granted without prior permission.',
		DateCreated: '19851125',
		Byline: 'David Riecks',
		BylineTitle: 'Photographer',
		City: 'Nainital',
		Sublocation: 'Snow Peak',
		State: 'Uttarakhand',
		Country: 'India',
		OriginalTransmissionReference: 'Sacred India',
		Headline: 'Southern Himalayan Mountains.',
		Credit: '©1985 David Riecks: www.riecks.c',
		Source: 'David Riecks Photography',
		CopyrightNotice: '©1985 David Riecks, All Rights Reserved',
	})

	testImage('iptc', 'iptc-staff-photographer-example.jpg', {
		// this does not represent all IPTC data in the file
		DateCreated: '20070419',
		TimeCreated: '110315-0600',
		Byline: 'John Doe',
		BylineTitle: 'Staff Photographer',
		City: 'Watseka',
		Sublocation: 'Moore family farm',
		State: 'Illinois',
		Country: 'United States',
		OriginalTransmissionReference: 'CSA farms',
		Headline: 'Farmer planting onions',
		Credit: 'Big Newspaper',
		Source: 'John Doe / Big Newspaper',
		CopyrightNotice: '©2010 Big Newspaper, all rights reserved',
		Writer: 'Susan Brown'
	})

	testImage('iptc', 'BonTonARTSTORplusIPTC.jpg', {
		// this does not represent all IPTC data in the file
		DateCreated: '20071119',
		Byline: 'Allan Kohl',
		Headline: 'Do you know your lesson?: Tailored ensembles imagined by Jeanne Lanvin',
		Credit: 'Allan Kohl; Minneapolis College of Art & Design Visual Resource Collection',
		Source: 'Core 4 Sample Database (VCat)',
		CopyrightNotice: 'publicDomain',
		// ... and then there's more data like keywords array
	})

	testImage('iptc', 'issue-fast-exif-2.jpg', {
		DateCreated: '20170506',
		TimeCreated: '152407',
		DigitalCreationDate: '20170506',
		DigitalCreationTime: '152407',
		Byline: 'FRPASSAQUAY'
	})

})