import Exifr from './src/index-full.js'


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
	'iptc':       ['headline', 'caption', 'source', 'country'],
}

let configurables = ['tiff', 'ifd0', 'exif', 'gps', 'interop', 'thumbnail']

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

		this.createDefaultOptions()

		this.thumbImg = document.querySelector('#thumb img')

		// dropzone
		document.body.addEventListener('dragenter', e => e.preventDefault())
		document.body.addEventListener('dragover', e => e.preventDefault())
		document.body.addEventListener('drop', e => {
			e.preventDefault()
			this.handleFile(e.dataTransfer.files[0])
		})

		// Load the demo image as array buffer to keep in memory
		// to prevent distortion of initial parse time.
		// i.e: show off library's performance and don't include file load time in it.
		//fetch('./test/fixtures/canon-dslr.jpg')
		fetch('./test/fixtures/IMG_20180725_163423.jpg')
			.then(res => res.arrayBuffer())
			.then(this.handleFile)

	}

	createDefaultOptions() {
		let instance = Exifr.optionsFactory()
		let object = cloneObject(instance)
		for (let key of configurables) {
			let val = object[key]
			if (val === undefined || val === false)
				object[key] = false
			else
				object[key] = true
		}
		delete object.pick
		delete object.skip
		object.thumbnail = true
		this.options = object
		//this.options.makerNote = true
		//this.options.userComment = true
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
			if (options.tiff === false) {
				options.ifd0        = false
				options.exif        = false
				options.gps         = false
				options.interop     = false
				options.thumbnail   = false
				options.makerNote   = false
				options.userComment = false
			} else {
				let defaultOptions = Exifr.optionsFactory()
				options.ifd0        = defaultOptions.ifd0
				options.exif        = defaultOptions.exif
				options.gps         = defaultOptions.gps
				options.interop     = defaultOptions.interop
				options.thumbnail   = defaultOptions.thumbnail
				options.makerNote   = defaultOptions.makerNote
				options.userComment = defaultOptions.userComment
			}
		}
		this.handleFile()
	}

	onPick(e) {
		this.handleFile(e.target.files[0])
	}

	handleFile = async (input = this.lastFile) => {
		if (this.lastFile !== input) {
			this.clear()
		}
		await this.reparseFile(input)
		if (this.lastFile !== input) {
			await this.initialfullFileParse(input)
			this.lastFile = input
		}
	}

	async initialfullFileParse(input) {
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

	async reparseFile(input) {
		let options = cloneObject(this.options)

		// parse with users preconfigured settings
		let t1 = performance.now()
		let rawOutput = await Exifr.parse(input, options)
		let t2 = performance.now()
		this.parseTime = (t2 - t1).toFixed(1)

		if (rawOutput)
			this.rawOutput = this.cleanOutput(rawOutput)
		else
			this.rawOutput = 'The file has no EXIF'
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

	cleanOutput(output = {}) {
		output = cloneObject(output)
		let exif = output.exif || output
		if (exif.makerNote) exif.makerNote = '[... OMITTED ...]'
		if (exif.userComment) exif.userComment = '[... OMITTED ...]'
		//if (exif.ApplicationNotes) exif.ApplicationNotes = '[... OMITTED ...]'
		return output
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