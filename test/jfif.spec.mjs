import {assert} from './test-util-core.mjs'
import {testSegment, testMergeSegment, testImage} from './test-util-suites.mjs'
import {Exifr} from '../src/bundles/full.mjs'
import * as exifr from '../src/bundles/full.mjs'


describe('JFIF Segment', () => {

	describe('options.jfif enable/disable', () => {
		testSegment({
			key: 'jfif',
			fileWith: 'issue-exifr-4.jpg',
			fileWithout: undefined,
			definedByDefault: false,
		})
	})

	testMergeSegment({
		key: 'jfif',
		file: 'issue-exifr-4.jpg',
		properties: ['XResolution', 'ThumbnailWidth']
	})

	testImage('jfif', 'issue-exifr-4.jpg', {
		XResolution: 96,
		ThumbnailWidth: 0,
	})

})