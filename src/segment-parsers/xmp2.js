//import {promises as fs} from 'fs'



// NOTE: XMP can contain multiple rdf:Description tags. for example MunchSP1919.xml
//       where each desc contains different scope tags (one desc for tiff:, another for crs:, another for aux:, etc...)
const openTag = '<rdf:RDF'
const endTag = '</rdf:RDF>'
//const openTag = '<rdf:Description'
//const endTag = '</rdf:Description>'

const CHILDREN_PROP = 'children'

export class XmpParser {

	options = {
		groupByNamespace: false,
		includeNamespace: false, /// ?? 
		normalizeNamespace: true // TODO: remove
	}

	static parse(arg, options) {
		let instance = new this
		Object.assign(instance.options, options)
		return instance.parse(arg)
	}

	parse = xmpString => {
		xmpString = this.getRdfContent(xmpString)
		this.root = {}
		return this.parseTag(xmpString, this.root)
	}

	getRdfContent(xmpString) {
		let start = xmpString.indexOf(openTag)
		if (start !== -1) {
			let end = xmpString.indexOf(endTag)
			xmpString = end === -1
				? xmpString.slice(start)
				: xmpString.slice(start, end + endTag.length)
		}
		let matches = matchTags(xmpString)
		if (matches.length === 1 && isRdfRdf(matches[0]))
			return matches[0].children.trim()
		else
			return xmpString
	}

	// accepts xmp, can contain more than one tags, extracts them and returns them
	parseTag = (xmpString, target = {}) => {
		console.log('parseTag', xmpString)
		let matches = matchTags(xmpString)
		let tags = matches
			.map(tag => this.processTag(tag, target))
			.filter(isNotUndefined)
		if (tags.length)
			return tags
		else if (matches.length)
			return target
		else
			return normalizeValue(xmpString)
	}

	processTag = (tag, parent) => {
		let {namespace, name, attrs, children} = tag
		children = this.parseTag(children, parent)
		attrs = this.parseAttributes(attrs)
		console.log('------------------------ processTag --------------------------')
		console.log(namespace + ':' + name)
		console.log('parent  ', parent)
		console.log('attrs   ', attrs)
		console.log('children', children)
		tag.children = children
		tag.attrs    = attrs
		console.log('this.options.groupByNamespace', this.options.groupByNamespace)
		if (this.options.groupByNamespace)
			this.storeTagInNamespace(tag)
		else
			return this.storeTagHierarchically(tag, parent)
	}

	storeTagInNamespace(tag) {
		console.log('storeTagInNamespace', tag)
		let {namespace, name, attrs, children} = tag
		let {root} = this
		if (root[namespace] === undefined) root[namespace] = {}
		let ns = root[namespace]
		return this.storeTagHierarchically(tag, ns)
	}

	storeTagHierarchically(tag, parent) {
		console.log('storeTagHierarchically', tag)
		let {namespace, name, attrs, children} = tag
		if (isRdfDescription(tag)) {
			console.log('=> root', attrs)
			this.assignAttributesToObject(attrs, parent)
		} else if (isList(tag)) {
			console.log('=> list', children)
			return children
		} else if (isListItem(tag)) {
			if (attrs.length > 0) {
				let output = this.createAttributesObject(attrs)
				console.log('=> item attr', output)
				return output
			} else {
				console.log('=> item child', children)
				return children
			}
		} else {
			let key = this.createKey(namespace, name)
			if (attrs.length > 0) {
				// TAG WITH ATTRIBUTES (and potentially with children)
				parent[key] = this._createFromAttributes(tag)
				console.log('=> attrs to parent', parent[key])
			} else if (attrs.length === 0) {
				// CLEAN TAG (without attributes)
				parent[key] = this._createFromChildren(tag)
				console.log('=> children to parent', parent[key])
			}
		}
	}

	assignAttributesToObject(attrs, target = {}) {
		for (let {namespace, name, value} of attrs) {
			let key = this.createKey(namespace, name)
			target[key] = value
		}
		return target
	}

	_createFromAttributes(tag) {
		let {namespace, name, attrs, children} = tag
		let output = this.createAttributesObject(attrs)
		if (children) output[CHILDREN_PROP] = children
		return output
	}

	_createFromChildren(tag) {
		let {namespace, name, attrs, children} = tag
		if (Array.isArray(children) && children.length === 1)
			return unwrapArray(children)
		else
			return children
	}

	createAttributesObject(attrs) {
		let output = {}
		this.assignAttributesToObject(attrs, output)
		return output
	}

	parseAttributes(attrString) {
		return matchAttributes(attrString)
	}

	createKey(namespace, name) {
		let {includeNamespace, normalizeNamespace} = this.options
		if (!includeNamespace) return name
		if (normalizeNamespace)
			return normalizeCasing(namespace) + name
		else
			return namespace + name
	}

}

function unwrapArray(array) {
	while (Array.isArray(array) && array.length === 1)
		array = array[0]
	return array
}

function matchAll(string, regex) {
	let matches = []
	let match
	while ((match = regex.exec(string)) !== null)
		matches.push(match)
	return matches
}

export function matchTags(string) {
	// NOTE: regex has to be recreated each time because it's stateful due to use in exec()
	// handles both pair and self-closing tags.
	let regex = /<([\w\d-]+):([\w\d-]+)((\s+?[\w\d-:]+=("[^"]*"|'[^']*'))*\s*)(\/>|>([\s\S]*?)<\/\1:\2>)/gm
	return matchAll(string, regex).map(unpackTagMatch)
}

export function matchAttributes(string) {
	// NOTE: regex has to be recreated each time because it's stateful due to use in exec()
	let regex = /([a-zA-Z0-9-]+):([a-zA-Z0-9-]+)=("[^"]*"|'[^']*')/gm
	return matchAll(string, regex).map(unpackAttrMatch)
}

function unpackTagMatch(match) {
	let namespace = match[1]
	let name = match[2]
	let children = match[7]
	let attrs = match[3]
	return {namespace, name, attrs, children}
}

function unpackAttrMatch(match) {
	let namespace = match[1]
	let name = match[2]
	let value = match[3].slice(1, -1)
	value = normalizeValue(value)
	return {namespace, name, value}
}

export function normalizeValue(value) {
	if (isUndefinable(value)) return undefined
	let num = Number(value)
	if (!Number.isNaN(num)) return num
	let lowercase = value.toLowerCase()
	if (lowercase === 'true') return true
	if (lowercase === 'false') return false
	return value.trim()
}

function isUndefinable(value) {
	return value === ''
		|| value === null
		|| value === undefined
		|| value === 'null'
		|| value === 'undefined'
}

function isEmpty(value) {
	return isUndefinable(value)
		|| isEmptyObj(value)
}

function isEmptyObj(object) {
	return object.length === 0
		|| Object.keys(object).length === 0
}

function isRdfRdf(tag) {
	return tag.namespace === 'rdf'
		&& tag.name === 'RDF'
}

function isRdfDescription(tag) {
	return tag.namespace === 'rdf'
		&& tag.name === 'Description'
}

function isList(tag) {
	return tag.namespace === 'rdf'
		&& (tag.name === 'Seq' || tag.name === 'Bag' || tag.name === 'Alt')
}

function isListItem(tag) {
	return tag.namespace === 'rdf'
		&& tag.name === 'li'
}

function isNotUndefined(arg) {
	return arg !== undefined
}

// drone-dji => droneDji
function normalizeCasing(string) {
	return string.replace(/-\w/g, match => match[1].toUpperCase())
}