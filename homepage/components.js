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
	get keys() {
		return this.showAll ? undefined : outputFilters[this.key]
	}
	get canShowMore() {
		return this.data !== undefined
			&& this.key !== 'xmp'
	}
	// overcome aurelia's bugs
	optionsChanged(newValue) {this.options = newValue}
	outputChanged(newValue) {this.rawOutput = newValue}
	keysChanged(newValue) {this.keys = newValue}
}

const segmentBoxTemplate = `
	<div class.bind="options[key] ? '' : 'disabled'">
		<h3>
			\${title || key}
			<span click.trigger="showAll = !showAll" show.bind="canShowMore">
				\${showAll ? 'Show less' : 'Show all'}
			</span>
		</h3>
		<template if.bind="data !== undefined">
			<object-table if.bind="display === 'table'" object.bind="data" keys.bind="keys"></object-table>
			<pre if.bind="display === 'buffer'">\${data | binary:showAll}</pre>
			<pre if.bind="display === 'string'">\${data | charLimit:showAll}</pre>
		</template>
		<span if.bind="data === undefined" class="small">
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
decorate(SegmentBoxCustomElement, 'keys', au.computedFrom('key', 'showAll'))
decorate(SegmentBoxCustomElement, 'data', au.computedFrom('key', 'output'))
decorate(SegmentBoxCustomElement, 'canShowMore', au.computedFrom('data', 'key'))



export class ObjectTableCustomElement {
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
decorate(ObjectTableCustomElement, 'keys', au.bindable({defaultBindingMode: au.bindingMode.twoWay}))
decorate(ObjectTableCustomElement, 'map', au.computedFrom('object', 'keys'))
