import Exifr from '../src/index-full.js'
import {readBlobAsArrayBuffer} from '../src/reader.js'
import {tiffBlocks, segmentsAndBlocks, tiffExtractables, formatOptions} from '../src/options.js'
import {JsonValueConverter} from './json-beautifier.js'
import cloneObject from './clone.js'
import {SegmentBoxCustomElement, ObjectTableCustomElement} from './components.js'
import {BinaryValueConverter} from './util.js'
import '../src/util/debug.js'


//let demoFileName = './test/fixtures/canon-dslr.jpg'
let fixtureDirPath = './test/fixtures/'
let demoFileName = 'IMG_20180725_163423.jpg'


class ExifrDemoApp {

	toggleSegment(name) {
	}

	ifd0Filter =      ['ImageWidth', 'ImageHeight', 'Make', 'Model', 'Software']
	exifFilter =      ['ExposureTime', 'ShutterSpeedValue', 'FNumber', 'ApertureValue', 'ISO', 'LensModel']
	gpsFilter =       ['latitude', 'longitude']
	interopFilter =   ['InteropIndex', 'InteropVersion']
	iptcFilter =      ['headline', 'caption', 'source', 'country']
	thumbnailFilter = ['ImageWidth', 'ImageHeight', 'ThumbnailLength']

	rawFullscreen = false

	demoFiles = [{
		text: 'JPEG Google Pixel photo',
		name: 'IMG_20180725_163423.jpg',
	}, {
		text: 'JPEG Google Pixel pano',
		name: 'PANO_20180725_162444.jpg',
	}, {
		text: 'HEIC iPhone photo',
		name: 'heic-iphone7.heic',
	}, {
		text: 'TIFF Drone photo',
		name: 'issue-metadata-extractor-152.tif',
	}, {
		text: 'Photo with IPTC descriptions',
		name: 'iptc-independent-photographer-example.jpg',
	}]

	constructor() {
		this.setStatus('Loading image')
		this.setupDom().catch(this.handleError)
		this.setupExifr().catch(this.handleError)
	}

	async setupDom() {
		this.thumbImg = document.querySelector('#thumb img')

		// dropzone
		document.body.addEventListener('dragenter', e => e.preventDefault())
		document.body.addEventListener('dragover', e => e.preventDefault())
		document.body.addEventListener('drop', this.onDrop)
	}

	async setupExifr() {
		this.createDefaultOptions()
		// Load the demo image as array buffer to keep in memory
		// to prevent distortion of initial parse time.
		// i.e: show off library's performance and don't include file load time in it.
		this.loadPhoto(demoFileName)
	}

	handleError = err => {
		console.error(err)
		this.setStatus('ERROR: ' + err.message, 'red')
	}

	createDefaultOptions() {
		this.options = {}
		for (let key in Exifr.Options)
			if (key !== 'pick' && key !== 'skip')
				this.options[key] = Exifr.Options[key]
		this.options.thumbnail = true
	}
/*
	createDefaultOptions() {
		this.options = {}
		for (let key of segmentsAndBlocks) this.options[key] = true
		for (let key of tiffExtractables)  this.options[key] = true
		for (let key of formatOptions)     this.options[key] = true
	}
*/
	onCheckboxChanged = e => {
		let boxNode = boxNodes[e.target.name]
		if (boxNode) {
			if (e.target.checked)
				boxNode.classList.remove('disabled')
			else
				boxNode.classList.add('disabled')
		}
		this.handleFile()
	}

	updateOptions(updatedField) {
		let options = this.options
		if (updatedField === 'tiff') {
			let copyProps = [...tiffBlocks, ...tiffExtractables]
			if (options.tiff === false) {
				for (let key in copyProps)
					options[key] = false
			} else {
				for (let key in copyProps)
					options[key] = Exifr.Options[key]
			}
		}
		this.handleFile()
	}

	async loadPhoto(fileName) {
		let filePath = fixtureDirPath + fileName
		let res = await fetch(filePath)
		let file = await res.arrayBuffer()
		this.handleFile(file)
	}

	onDrop = async e => {
		e.preventDefault()
		this.processBlob(e.dataTransfer.files[0])
	}

	onPick = async e => {
		this.processBlob(e.target.files[0])
	}

	async processBlob(blob) {
		let file = await readBlobAsArrayBuffer(blob)
		this.handleFile(file)
	}

	handleFile = async (file = this.file) => {
		//this.setStatus(`parsing`)
		if (this.file !== file) {
			this.clear()
		}
		try {
			await this.parseForPerf(file)
			await this.parseForPrettyOutput(file)
		} catch (err) {
			this.handleError(err)
		}
	}

	async parseForPerf(input) {
		let options = cloneObject(this.options)

		// parse with users preconfigured settings
		let t1 = performance.now()
		let output = await Exifr.parse(input, options)
		let t2 = performance.now()
		let parseTime = (t2 - t1).toFixed(1)
		this.setStatus(`parsed in ${parseTime} ms`)

		if (output)
			this.rawOutput = this.cleanOutput(output)
		else
			this.rawOutput = 'The file has no EXIF'
	}

	setStatus(text, color = '') {
		this.status = text
		this.color = color
	}

	cleanOutput(output = {}) {
		output = cloneObject(output)
		if (output.makerNote) output.makerNote = '[... OMITTED ...]'
		if (output.userComment) output.userComment = '[... OMITTED ...]'
		let exif = output.exif || output
		if (exif.MakerNote) exif.MakerNote = '[... OMITTED ...]'
		if (exif.UserComment) exif.UserComment = '[... OMITTED ...]'
		//if (exif.ApplicationNotes) exif.ApplicationNotes = '[... OMITTED ...]'
		return output
	}

	async parseForPrettyOutput(input) {
		let options = cloneObject(this.options)

		// now parse again for the nice boxes with clear information.
		options.mergeOutput = false
		options.sanitize = true
		let exifr = new Exifr(options)
		await exifr.read(input)
		let output = await exifr.parse() || {}
		this.output = output
		this.browserCompatibleFile = !!exifr.file.isJpeg

		this.makerNote = output.makerNote || output.MakerNote || output.exif && output.exif.MakerNote
		this.userComment = output.userComment || output.UserComment || output.exif && output.exif.UserComment

		if (output.thumbnail) {
			let arrayBuffer = await exifr.extractThumbnail()
			let blob = new Blob([arrayBuffer])
			this.thumbUrl = URL.createObjectURL(blob)
		}

		if (input instanceof ArrayBuffer)
			this.imageUrl = URL.createObjectURL(new Blob([input]))
		if (input instanceof Blob)
			this.imageUrl = URL.createObjectURL(input)
		if (typeof input === 'string')
			this.imageUrl = input
	}

	browserCompatibleFile = true
	clear() {
		this.rawOutput = undefined
		this.output = undefined
		this.browserCompatibleFile = true
		if (this.thumbUrl) {
			URL.revokeObjectURL(this.thumbUrl)
			this.thumbUrl = undefined
		}
		if (this.imageUrl) {
			URL.revokeObjectURL(this.imageUrl)
			this.imageUrl = undefined
		}
	}


}


au.enhance({
	root: ExifrDemoApp,
	host: document.body,
	resources: [
		BinaryValueConverter,
		JsonValueConverter,
		ObjectTableCustomElement,
		SegmentBoxCustomElement,
	]
})