var exifr
import {JsonValueConverter} from './json-beautifier.js'
import cloneObject from './clone.js'
import {SegmentBoxCustomElement, ObjectTableCustomElement} from './components.js'
import {BinaryValueConverter, CharLimitValueConverter, PrettyCaseValueConverter} from './util.js'


let fixtureDirPath = './test/fixtures/'
let demoFileName = 'IMG_20180725_163423-tiny.jpg'
let demoFileSize = 311406


class ExifrDemoApp {

	constructor() {
		this.setup().catch(this.handleError)
	}

	async setup() {
		this.thumbImg = document.querySelector('#thumb img')

		// dropzone
		document.body.addEventListener('dragenter', e => e.preventDefault())
		document.body.addEventListener('dragover', e => e.preventDefault())
		document.body.addEventListener('drop', this.onDrop)

		if (window.location.origin.includes('localhost'))
			exifr = await import('../src/bundle-full.js')
		else
			exifr = await import('../dist/full.esm.js')

		this.options = cloneObject(exifr.Options.default)
		this.options.ifd1 = true
		// Load the demo image as array buffer to keep in memory
		// to prevent distortion of initial parse time.
		// i.e: show off library's performance and don't include file load time in it.
		this.loadPhoto(demoFileName, demoFileSize)
	}

	async loadPhoto(fileName, expectedFileSize) {
		this.setStatus('Loading image')
		let filePath = fixtureDirPath + fileName
		let res = await fetch(filePath)
		let fetchedSize = Number(res.headers.get('content-length'))
		if (fetchedSize === expectedFileSize) {
			// TODO expectedFileSize
			let file = await res.arrayBuffer()
			this.parseFile(file)
		} else {
			this.setStatus(`Demo image couldn't load: You are using data saver.`, 'red')
		}
	}

	handleError = err => {
		console.error(err)
		this.setStatus('ERROR: ' + err.message, 'red')
	}

	toggleAllOptions() {
		let keys = [...exifr.segmentsAndBlocks, ...exifr.tiffExtractables]
		let values = keys.map(key => this.options[key])
		let hasSomethingUnchecked = values.some(val => val === false)
		for (let key of keys)
			this.options[key] = hasSomethingUnchecked
		this.parseFile()
	}

	onCheckboxChanged = e => {
		let boxNode = boxNodes[e.target.name]
		if (boxNode) {
			if (e.target.checked)
				boxNode.classList.remove('disabled')
			else
				boxNode.classList.add('disabled')
		}
		this.parseFile()
	}

	onDrop = async e => {
		e.preventDefault()
		this.processBlob(e.dataTransfer.files[0])
	}

	onPick = async e => {
		this.processBlob(e.target.files[0])
	}

	async processBlob(blob) {
		let file = await exifr.readBlobAsArrayBuffer(blob)
		this.parseFile(file)
	}

	parseFile = async (file = this.file) => {
		//this.setStatus(`parsing`)
		if (this.file !== file) {
			this.file = file
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
		delete options.tiff

		// parse with users preconfigured settings
		let t1 = performance.now()
		let output = await exifr.parse(input, options)
		let t2 = performance.now()
		let parseTime = (t2 - t1).toFixed(1)
		this.setStatus(`parsed in ${parseTime} ms`)

		this.rawOutput = output || 'The file has no EXIF'
	}

	setStatus(text, color = '') {
		this.status = text
		this.color = color
	}

	async parseForPrettyOutput(input) {
		let options = cloneObject(this.options)
		delete options.tiff
		// now parse again for the nice boxes with clear information.
		options.mergeOutput = false
		options.sanitize = true
		options.translateKeys = true
		// paarse
		let exr = new exifr.Exifr(options)
		await exr.read(input)
		let output = await exr.parse() || {}
		this.output = output
		this.browserCompatibleFile = !!exr.file.isJpeg

		if (output.ifd1) {
			let arrayBuffer = await exr.extractThumbnail()
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
		CharLimitValueConverter,
		JsonValueConverter,
		ObjectTableCustomElement,
		SegmentBoxCustomElement,
		PrettyCaseValueConverter,
	]
})