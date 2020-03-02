import decorate from '../node_modules/decorate/index.js'


let outputFilters = {
	ifd0:      ['ImageWidth', 'ImageHeight', 'Make', 'Model', 'Software'],
	exif:      ['ExposureTime', 'ShutterSpeedValue', 'FNumber', 'ApertureValue', 'ISO', 'LensModel'],
	gps:       ['latitude', 'longitude'],
	interop:   ['InteropIndex', 'InteropVersion'],
	thumbnail: ['ImageWidth', 'ImageHeight', 'ThumbnailLength'],
	iptc:      ['Headline', 'Byline', 'Credit', 'Caption', 'Source', 'Country'],
	icc:       ['ProfileVersion', 'ProfileClass', 'ColorSpaceData', 'ProfileConnectionSpace', 'ProfileFileSignature', 'DeviceManufacturer', 'RenderingIntent', 'ProfileCreator', 'ProfileDescription'],

}


export class SegmentBoxCustomElement {
	constructor() {
		// NOTE: do not use the new class property syntax. FireFox doesn't support it yet.
		this.showAll = false
		this.display = 'table'
	}
	get data() {
		return this.rawOutput && this.rawOutput[this.key]
	}
	get hasData() {
		return this.data !== undefined
	}
	// overcome aurelia's bugs
	optionsChanged(newValue) {this.options = newValue}
	outputChanged(newValue) {this.rawOutput = newValue}
}

const segmentBoxTemplate = `
	<div class.bind="options[key] ? '' : 'disabled'">
		<h3>
			\${title || key}
			<span click.trigger="showAll = !showAll" show.bind="hasData">
				\${showAll ? 'Show less' : 'Show all'}
			</span>
		</h3>
		<template if.bind="hasData">
			<object-table if.bind="display === 'table'" object.bind="data" show-all.bind="showAll" key.bind="key"></object-table>
			<pre if.bind="display === 'buffer'">\${data | byteLimit:showAll}</pre>
			<pre if.bind="display === 'string'">\${data | charLimit:showAll}</pre>
		</template>
		<span if.bind="!hasData" class="small">
			\${options[key] ? "File doesn't contain" : 'Not parsing'} \${alias || key}
		</span>
	</div>
`

decorate(SegmentBoxCustomElement, au.inlineView(`<template>${segmentBoxTemplate}</template>`))
decorate(SegmentBoxCustomElement, 'options', au.bindable({defaultBindingMode: au.bindingMode.twoWay}))
decorate(SegmentBoxCustomElement, 'output', au.bindable({defaultBindingMode: au.bindingMode.twoWay}))
decorate(SegmentBoxCustomElement, 'display', au.bindable)
decorate(SegmentBoxCustomElement, 'key', au.bindable)
decorate(SegmentBoxCustomElement, 'title', au.bindable)
decorate(SegmentBoxCustomElement, 'alias', au.bindable)
decorate(SegmentBoxCustomElement, 'data', au.computedFrom('key', 'output'))
decorate(SegmentBoxCustomElement, 'hasData', au.computedFrom('data'))



export class ObjectTableCustomElement {
	get map() {
		return new Map(this.filterObject())
	}
	filterObject() {
		if (!this.object) return []
		if (this.showAll) {
			return Object.entries(this.object)
		} else {
			let keys = outputFilters[this.key] || Object.keys(this.object).slice(0, 10)
			return keys.map(key => [key, this.object[key]])
		}
	}
	// overcome aurelia's bugs
	objectChanged(newValue) {this.object = newValue}
	keyChanged(newValue) {this.key = newValue}
	showAllChanged(newValue) {this.showAll = newValue}
}

var objectTableTemplate = `
	<table>
		<tr repeat.for="[key, val] of map">
			<td>\${key | prettyCase}</td>
			<td>\${val | tableValue}</td>
		</tr>
	</table>
`

decorate(ObjectTableCustomElement, au.inlineView(`<template>${objectTableTemplate}</template>`))
decorate(ObjectTableCustomElement, 'object', au.bindable({defaultBindingMode: au.bindingMode.twoWay}))
decorate(ObjectTableCustomElement, 'key', au.bindable({defaultBindingMode: au.bindingMode.twoWay}))
decorate(ObjectTableCustomElement, 'showAll', au.bindable({defaultBindingMode: au.bindingMode.twoWay}))
decorate(ObjectTableCustomElement, 'map', au.computedFrom('object', 'showAll'))
