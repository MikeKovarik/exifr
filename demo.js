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

//let demoFileName = './test/fixtures/canon-dslr.jpg'
let fixtureDirPath = './test/fixtures/'
let demoFileName = 'IMG_20180725_163423.jpg'

Promise.timeout = millis => new Promise(resolve => setTimeout(resolve, millis))

const jsonTypeStart = `<<||JSON-TYPE||`
const jsonTypeEnd = `<<||JSON||>>`
const jsonStartSeparator = '>>'

function getTypeHeader(type) {
	return jsonTypeStart + type + jsonStartSeparator
}

const jsonTypes = [
	Uint8Array,
	Uint16Array,
	Uint32Array,
	Int8Array,
	Int16Array,
	Int32Array,
]

const BufferReplacer = arr => Array.from(arr).join('-')
const replacers = {
	Uint8Array:  BufferReplacer,
	Uint16Array: BufferReplacer,
	Uint32Array: BufferReplacer,
	Int8Array:   BufferReplacer,
	Int16Array:  BufferReplacer,
	Int32Array:  BufferReplacer,
}

const revivers = {
	Uint8Array:  string => new Uint8Array(string.split('-').map(str => Number(str))),
	Uint16Array: string => new Uint16Array(string.split('-').map(str => Number(str))),
	Uint32Array: string => new Uint32Array(string.split('-').map(str => Number(str))),
	Int8Array:   string => new Int8Array(string.split('-').map(str => Number(str))),
	Int16Array:  string => new Int16Array(string.split('-').map(str => Number(str))),
	Int32Array:  string => new Int32Array(string.split('-').map(str => Number(str))),
}

function cloneReplacer(key, val) {
	if (typeof val === 'object') {
		for (let Class of jsonTypes) {
			if (val instanceof Class) {
				let replacer = replacers[Class.name]
				let serialized = replacer(val)
				return getTypeHeader(Class.name) + serialized + jsonTypeEnd
			}
		}
	}
	return val
}

function cloneReviver(key, val) {
	if (typeof val === 'string' && val.startsWith(jsonTypeStart) && val.endsWith(jsonTypeEnd)) {
		let tempIndex = val.indexOf(jsonStartSeparator)
		let type = val.slice(jsonTypeStart.length, tempIndex)
		let serialized = val.slice(tempIndex + jsonStartSeparator.length, -jsonTypeEnd.length)
		let reviver = revivers[type]
		return reviver(serialized)
	}
	return val
}

function cloneObject(object) {
	let json = JSON.stringify(object, cloneReplacer)
	return JSON.parse(json, cloneReviver)
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

const reviverStart = '💿✨💀'
const reviverEnd   = '💾✨⚡'
const reviverStartRegex = new RegExp('"' + reviverStart, 'g')
const reviverEndRegex   = new RegExp(reviverEnd + '"', 'g')

function reviverWrap(string) {
	return reviverStart + string + reviverEnd
}

Uint8Array.prototype.toJSON =
Uint16Array.prototype.toJSON =
Uint32Array.prototype.toJSON =
Int8Array.prototype.toJSON =
Int16Array.prototype.toJSON =
Int32Array.prototype.toJSON = function() {
	return reviverWrap(`<${this.constructor.name} ${Array.from(this).map(num => num.toString(16).padStart(2, '0')).join(' ')}>`)
}

Array.prototype.toJSON = function() {
	return reviverWrap(`[${this.join(', ')}]`)
}

Date.prototype.toJSON = function() {
	return reviverWrap(`<Date ${this.toISOString()}>`)
}

class JsonValueConverter {
    toView(arg, spaces = 2) {
		if (arg === undefined) return
		if (arg === null) return
		return JSON.stringify(arg, null, spaces)
			.replace(reviverStartRegex, '')
			.replace(reviverEndRegex, '')
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

	async loadPhoto(fileName) {
		let filePath = fixtureDirPath + fileName
        console.log('-: filePath', filePath)
		let res = await fetch(filePath)
		this.file = await res.arrayBuffer()
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
		let options = cloneObject(this.options)

		// parse with users preconfigured settings
		let t1 = performance.now()
		let output = await Exifr.parse(input, options)
		let t2 = performance.now()
		let parseTime = (t2 - t1).toFixed(1)
		this.setStatus(`parsed in ${parseTime} ms`)

            console.log('-: output', output)
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
		let parser = new Exifr(options)
		await parser.read(input)
		let output = await parser.parse() || {}
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