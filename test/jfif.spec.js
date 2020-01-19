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
		properties: ['Xdensity', 'Xthumbnail']
	})

	testImage('jfif', 'issue-exifr-4.jpg', {
		Ydensity: 96,
		Xthumbnail: 0,
	})

})