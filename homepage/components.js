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
	showAll = false
	display = 'table'
	static template = `
		<div class.bind="options[key] ? '' : 'disabled'">
			<h3>
				\${title || key}
				<span click.trigger="showAll = !showAll">\${showAll ? 'Show less' : 'Show all'}</span>
			</h3>
			<template if.bind="data !== undefined">
				<object-table if.bind="display === 'table'" object.bind="data" keys.bind="keys"></object-table>
				<pre if.bind="display === 'buffer'">\${data | binary:showAll}</pre>
				<pre if.bind="display === 'string'">\${data}</pre>
			</template>
			<span if.bind="data === undefined" class="small">
				\${options[key] ? "File doesn't contain" : 'Not parsing'} \${alias || key}
			</span>
		</div>
	`
	get data() {
		return this.rawOutput && this.rawOutput[this.key]
	}
	get keys() {
		return this.showAll ? undefined : outputFilters[this.key]
	}
	// overcome aurelia's bugs
	optionsChanged(newValue) {this.options = newValue}
	outputChanged(newValue) {this.rawOutput = newValue}
	keysChanged(newValue) {this.keys = newValue}
}
decorate(SegmentBoxCustomElement, au.inlineView(`<template>${SegmentBoxCustomElement.template}</template>`))
decorate(SegmentBoxCustomElement, 'options', au.bindable({defaultBindingMode: au.bindingMode.twoWay}))
decorate(SegmentBoxCustomElement, 'output', au.bindable({defaultBindingMode: au.bindingMode.twoWay}))
decorate(SegmentBoxCustomElement, 'display', au.bindable)
decorate(SegmentBoxCustomElement, 'key', au.bindable)
decorate(SegmentBoxCustomElement, 'title', au.bindable)
decorate(SegmentBoxCustomElement, 'alias', au.bindable)
decorate(SegmentBoxCustomElement, 'keys', au.computedFrom('key', 'showAll'))
decorate(SegmentBoxCustomElement, 'data', au.computedFrom('key', 'output'))



export class ObjectTableCustomElement {
	static template = `
		<table>
			<tr repeat.for="[key, val] of map">
				<td>\${key | prettyCase}</td>
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
