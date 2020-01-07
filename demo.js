import Exifr from './src/index-full.js'
import {readBlobAsArrayBuffer} from './src/file-readers/essentials.js'
import {tiffBlocks, segmentsAndBlocks, tiffExtractables, formatOptions} from './src/options.js'


/*
// TODO: separate these from raw output
Long properties
XPComment in IFD0 in issue-exifr-13.jpg
ImageDescription in IFD0 in Bush-dog.jpg
MakerNote

// tyhle jsou number array v ifd0 (binarni?)
0x9C9B: 'XPTitle', //
0x9C9C: 'XPComment', //
0x9C9D: 'XPAuthor', // 
0x9C9E: 'XPKeywords', //
0x9C9F: 'XPSubject', //
*/

//let demoFilePath = './test/fixtures/canon-dslr.jpg'
let demoFilePath = './test/fixtures/IMG_20180725_163423.jpg'

Promise.timeout = millis => new Promise(resolve => setTimeout(resolve, millis))

function cloneObject(object) {
	return JSON.parse(JSON.stringify(object))
}

function decorate(Class, key, decorator) {
	if (decorator === undefined) {
		decorator = key
		decorator(Class)
	} else {
		let proto = Class.prototype
		let descriptor = Object.getOwnPropertyDescriptor(proto, key) || {}
		decorator(proto, key, descriptor)
	}
}


class BinaryValueConverter {
    toView(arg) {
		if (arg === undefined) return
		if (arg === null) return
		return Array.from(arg)
			.map(num => num.toString(16).padStart(2, '0'))
			.join(' ')
    }
}

class JsonValueConverter {
    toView(arg, spaces = 2) {
		if (arg === undefined) return
		if (arg === null) return
		return JSON.stringify(arg, null, spaces)
    }
}

let outputKeyPicks = {
	'ifd0':       ['ImageWidth', 'ImageHeight', 'Make', 'Model', 'Software'],
	'thumbnail':  ['ImageWidth', 'ImageHeight', 'ThumbnailLength'],
	'exif':       ['ExposureTime', 'ShutterSpeedValue', 'FNumber', 'ApertureValue', 'ISO', 'LensModel'],
	'gps':        ['latitude', 'longitude'],
	'interop':    ['InteropIndex', 'InteropVersion'],
	'iptc':       ['headline', 'caption', 'source', 'country'], // TODO update
}

class SegmentBoxCustomElement {
	showAll = false
	static template = `
		<div class.bind="options[type] ? '' : 'disabled'">
			<h3>
				\${type}
				<span click.trigger="showAll = !showAll">\${showAll ? 'Show less' : 'Show all'}</span>
			</h3>
			<object-table object.bind="data" keys.bind="keys"></object-table>
		</div>
	`
	get data() {
		return this.rawOutput && this.rawOutput[this.type]
	}
	get keys() {
		return this.showAll ? undefined : outputKeyPicks[this.type]
	}
	// overcome aurelia's bugs
	optionsChanged(newValue) {this.options = newValue}
	outputChanged(newValue) {this.rawOutput = newValue}
	keysChanged(newValue) {this.keys = newValue}
}
decorate(SegmentBoxCustomElement, au.inlineView(`<template>${SegmentBoxCustomElement.template}</template>`))
decorate(SegmentBoxCustomElement, 'options', au.bindable({defaultBindingMode: au.bindingMode.twoWay}))
decorate(SegmentBoxCustomElement, 'output', au.bindable({defaultBindingMode: au.bindingMode.twoWay}))
decorate(SegmentBoxCustomElement, 'type', au.bindable)
decorate(SegmentBoxCustomElement, 'keys', au.computedFrom('type', 'showAll'))
decorate(SegmentBoxCustomElement, 'data', au.computedFrom('type', 'output'))



class ObjectTableCustomElement {
	static template = `
		<table>
			<tr repeat.for="[key, val] of map">
				<td>\${key}</td>
				<td>\${val}</td>
			</tr>
		</table>
	`
	get map() {
		if (!this.object) return new Map
		if (this.keys)
			return new Map(this.keys.map(key => [key, this.object[key]]))
		else
			return new Map(Object.entries(this.object))
	}
	// overcome aurelia's bugs
	objectChanged(newValue) {this.object = newValue}
	keysChanged(newValue) {this.keys = newValue}
}
decorate(ObjectTableCustomElement, au.inlineView(`<template>${ObjectTableCustomElement.template}</template>`))
decorate(ObjectTableCustomElement, 'object', au.bindable({defaultBindingMode: au.bindingMode.twoWay}))
decorate(ObjectTableCustomElement, 'keys', au.bindable({defaultBindingMode: au.bindingMode.twoWay}))
decorate(ObjectTableCustomElement, 'map', au.computedFrom('object', 'keys'))



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
		this.file = await fetch(demoFilePath).then(res => res.arrayBuffer())
		this.handleFile(this.file)
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

	onDrop = async e => {
		e.preventDefault()
		this.processBlob(e.dataTransfer.files[0])
	}

	onPick = async e => {
		this.processBlob(e.target.files[0])
	}

	async processBlob(blob) {
		this.file = await readBlobAsArrayBuffer(blob)
		this.handleFile(this.file)
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
        console.log('-: parseForPerf')
		let options = cloneObject(this.options)

		// parse with users preconfigured settings
		let t1 = performance.now()
		let output = await Exifr.parse(input, options)
        console.log('-: output', output)
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
        console.log('-: parseForPrettyOutput')
		let options = cloneObject(this.options)

		// now parse again for the nice boxes with clear information.
		options.mergeOutput = false
		options.sanitize = true
		let parser = new Exifr(options)
		await parser.read(input)
		let output = await parser.parse() || {}
        console.log('-: output', output)
        console.log('-: output.ifd0', output.ifd0)
		this.output = output

		this.makerNote = output.makerNote || output.MakerNote || output.exif && output.exif.MakerNote
		this.userComment = output.userComment || output.UserComment || output.exif && output.exif.UserComment

		if (output.thumbnail) {
			let arrayBuffer = await parser.extractThumbnail()
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

	clear() {
		if (this.thumbUrl) {
			URL.revokeObjectURL(this.thumbUrl)
			this.thumbUrl = undefined
		}
		if (this.imageUrl) {
			URL.revokeObjectURL(this.imageUrl)
			this.imageUrl = undefined
		}
	}

	// ISO => ISO
	// XMPToolkit => XMP Toolkit
	// FNumber => F Number
	// AbsoluteAltitude => Absolute Altitude
	// FlightRollDegree => Flight Roll Degree
	// imageWidth => Image Width
	// latitude => Latitude
	splitTag(string) {
		return string.match(matchRegex).map(capitalize).join(' ')
	}

	capitalize(string) {
		return string.charAt(0).toUpperCase() + string.slice(1)
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

var matchRegex = /([A-Z]+(?=[A-Z][a-z]))|([A-Z][a-z]+)|([0-9]+)|([a-z]+)|([A-Z]+)/g