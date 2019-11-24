import {ExifParser, parse, optionsFactory} from './src/index-full.js'


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
		return this.output && this.output[this.type]
	}
	get keys() {
		return this.showAll ? undefined : outputKeyPicks[this.type]
	}
	// overcome aurelia's bugs
	optionsChanged(newValue) {this.options = newValue}
	outputChanged(newValue) {this.output = newValue}
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
		console.log('toggleSegment', name)
	}

	ifd0Filter =      ['ImageWidth', 'ImageHeight', 'Make', 'Model', 'Software']
	exifFilter =      ['ExposureTime', 'ShutterSpeedValue', 'FNumber', 'ApertureValue', 'ISO', 'LensModel']
	gpsFilter =       ['latitude', 'longitude']
	interopFilter =   ['InteropIndex', 'InteropVersion']
	iptcFilter =      ['headline', 'caption', 'source', 'country']
	thumbnailFilter = ['ImageWidth', 'ImageHeight', 'ThumbnailLength']

	constructor() {
		let instance = optionsFactory()
		let object = cloneObject(instance)
		delete object.pickTags
		delete object.skipTags
		this.options = object

		//this.options.makerNote = true
		//this.options.userComment = true


		this.thumbImg = document.querySelector('#thumb img')

		// file picker
		this.picker = document.querySelector('#picker')
		this.picker.addEventListener('change', e => handleFile(this.picker.files[0]))
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
				let defaultOptions = optionsFactory()
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

	handleFile = async (file = this.lastFile) => {
		this.clear()
		this.lastFile = file

		let options = cloneObject(this.options)

		// parse with users preconfigured settings
		let t1 = performance.now()
		let rawOutput = await parse(file, options)
		let t2 = performance.now()
		this.parseTime = (t2 - t1).toFixed(1)
/*
		if (rawOutput) {
			this.cleanOutput(rawOutput)
			outputNode.innerText = JSON.stringify(rawOutput, null, 2)
		} else {
			outputNode.innerText = 'The file has no EXIF'
		}
*/
		// now parse again for the nice boxes with clear information.
		options.mergeOutput = false
		options.postProcess = true
		let parser = new ExifParser(options)
		await parser.read(file)
		let output = await parser.parse() || {}
		this.output = output
		/*
		renderTable(parser, output, 'ifd0',    ['ImageWidth', 'ImageHeight', 'Make', 'Model', 'Software'])
		renderTable(parser, output, 'exif',    ['ExposureTime', 'ShutterSpeedValue', 'FNumber', 'ApertureValue', 'ISO', 'LensModel'])
		renderTable(parser, output, 'gps',     ['latitude', 'longitude'])
		renderTable(parser, output, 'interop', ['InteropIndex', 'InteropVersion'])
		renderTable(parser, output, 'iptc',    ['headline', 'caption', 'source', 'country'])
		renderTable(parser, output, 'xmp')
		renderTable(parser, output, 'thumbnail', ['ImageWidth', 'ImageHeight', 'ThumbnailLength'])
		*/

		/*
		// TODO: separate these from raw output
		Long properties
		XPComment in IFD0 in issue-exifr-13.jpg
		ImageDescription in IFD0 in Bush-dog.jpg
		MakerNote
		*/

		this.makerNote = output.makerNote || output.MakerNote || output.exif && output.exif.MakerNote
		this.userComment = output.userComment || output.UserComment || output.exif && output.exif.UserComment


		if (parser.thumbnail) {
			let arrayBuffer = await parser.extractThumbnail()
			let blob = new Blob([arrayBuffer])
			this.thumbUrl = URL.createObjectURL(blob)
		}

		//displayImage(file)
	}

	clear() {
		if (this.thumbUrl) {
			URL.revokeObjectURL(this.thumbUrl)
			this.thumbUrl = undefined
		}
	}

	/*
	function displayImage(blob) {
		if (this.thumbImg.src) {
			inputImg.style.height = this.thumbImg.height
			//inputImg.style.width = this.thumbImg.width
		}
		inputImg.src = URL.createObjectURL(blob)
	}

	function hideImage() {
	}
	*/

	cleanOutput(exif) {
		if (exif === undefined) return {}
		if (exif.exif) exif = exif.exif
		if (exif.MakerNote) exif.MakerNote = '[... OMITTED ...]'
		if (exif.UserComment) exif.UserComment = '[... OMITTED ...]'
		if (exif.ApplicationNotes) exif.ApplicationNotes = '[... OMITTED ...]'
	}

	renderTable(parser, output, name, props) {
		let {options} = parser
		let node = outputNodes[name]
		let data = output[name]
		if (data) {
			if (props) {
				let rows = props.map(prop => `<td>${splitTag(prop)}</td><td>${data[prop]}</td>`)
				node.innerHTML = '<tr>' + rows.join('</tr><tr>') + '</tr>'
			} else {
				node.innerText = data
			}
		} else if (!options[name]) {
			node.innerHTML = '<tr><tr>Not parsed</tr></tr>'
		} else {
			node.innerHTML = '<tr><tr>No data found</tr></tr>'
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