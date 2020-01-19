import {assert} from './test-util.js'
import {getFile, testSegment, testMergeSegment, testImage} from './test-util.js'
import Exifr from '../src/index-full.js'


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