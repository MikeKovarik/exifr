import decorate from '../node_modules/decorate/index.js'


let outputKeyPicks = {
	'ifd0':       ['ImageWidth', 'ImageHeight', 'Make', 'Model', 'Software'],
	'thumbnail':  ['ImageWidth', 'ImageHeight', 'ThumbnailLength'],
	'exif':       ['ExposureTime', 'ShutterSpeedValue', 'FNumber', 'ApertureValue', 'ISO', 'LensModel'],
	'gps':        ['latitude', 'longitude'],
	'interop':    ['InteropIndex', 'InteropVersion'],
	'iptc':       ['headline', 'caption', 'source', 'country'], // TODO update
}

export class SegmentBoxCustomElement {
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



export class ObjectTableCustomElement {
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
