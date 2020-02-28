/*
options = {
	groupByNamespace: false,
}
*/
export class XmpParser {
	static parse(input, options) {
		let instance = new this(input, options)
		return instance.parse()
	}

	constructor(input, options = {}) {
		this.input = input
		this.options = options
	}

	parse(xmpString = this.input) {
		let tags = XmlTag.findAll(xmpString, 'rdf', 'Description')
		if (tags.length === 0)
			tags.push(new XmlTag('rdf', 'Description', undefined, xmpString))
		if (this.options.groupByNamespace) {
			let root = {}
			let namespace
			for (let tag of tags) {
				for (let prop of tag.properties) {
					namespace = getNamespace(prop.ns, root)
					assignToObject(prop, namespace)
				}
			}
			return root
		} else {
			let outputs = tags.map(tag => tag.serialize())
			if (outputs.length === 1)
				return outputs[0]
			else
				return Object.assign(...outputs)
		}
	}

}

// ----- ATTRIBUTES -----


export class XmlAttr {

	static findAll(string) {
		// NOTE: regex has to be recreated each time because it's stateful due to use in exec()
		let regex = /([a-zA-Z0-9-]+):([a-zA-Z0-9-]+)=("[^"]*"|'[^']*')/gm
		return matchAll(string, regex).map(XmlAttr.unpackMatch)
	}

	static unpackMatch(match) {
		let ns = match[1]
		let name = match[2]
		let value = match[3].slice(1, -1)
		value = normalizeValue(value)
		return new XmlAttr(ns, name, value)
	}

	constructor(ns, name, value) {
		this.ns = ns
		this.name = name
		this.value = value
	}

	serialize() {
		return this.value
	}

}

// ----- TAGS -----

const tagNamePartRegex = '[\\w\\d-]+'
const VALUE_PROP = 'value'

export class XmlTag {

	static findAll(xmpString, ns, name) {
		// NOTE: regex has to be recreated each time because it's stateful due to use in exec()
		// handles both pair and self-closing tags.
		if (ns !== undefined || name !== undefined) {
			ns   = ns   || tagNamePartRegex
			name = name || tagNamePartRegex
			var regex = new RegExp(`<(${ns}):(${name})((\\s+?[\\w\\d-:]+=("[^"]*"|'[^']*'))*\\s*)(\\/>|>([\\s\\S]*?)<\\/\\1:\\2>)`, 'gm')
		} else {
			var regex = /<([\w\d-]+):([\w\d-]+)((\s+?[\w\d-:]+=("[^"]*"|'[^']*'))*\s*)(\/>|>([\s\S]*?)<\/\1:\2>)/gm
		}
		return matchAll(xmpString, regex).map(XmlTag.unpackMatch)
	}

	static unpackMatch(match) {
		let ns = match[1]
		let name = match[2]
		let attrString = match[3]
		let innerXml = match[7]
		return new XmlTag(ns, name, attrString, innerXml)
	}

	constructor(ns, name, attrString, innerXml) {
		this.ns = ns
		this.name = name
		this.attrString = attrString
		this.innerXml = innerXml
		this.attrs = XmlAttr.findAll(attrString)
		this.children = XmlTag.findAll(innerXml)
		this.value = this.children.length === 0 ? normalizeValue(innerXml) : undefined
		this.properties = [...this.attrs, ...this.children]
	}

	get isPrimitive() {
		return this.value !== undefined
			&& this.attrs.length === 0
			&& this.children.length === 0
	}

	get isListContainer() {
		return this.children.length === 1
			&& this.children[0].isList
	}

	get isList() {
		let {ns, name} = this
		return ns === 'rdf'
			&& (name === 'Seq' || name === 'Bag' || name === 'Alt')
	}

	serialize() {
		// invalid and undefined
		if (this.properties.length === 0 && this.value === undefined)
			return undefined
		// primitive property
		if (this.isPrimitive)
			return this.value
		// tag containing list tag <ns:tag><rdf:Seq>...</rdf:Seq></ns:tag>
		if (this.isListContainer)
			return this.children[0].serialize()
		// list tag itself <rdf:Seq>...</rdf:Seq>
		if (this.isList)
			return unwrapArray(this.children.map(serialize))
		// process attributes and children tags into object
		let output = {}
		for (let prop of this.properties)
			assignToObject(prop, output)
		if (this.value !== undefined)
			output[VALUE_PROP] = this.value
		return output
	}

}

// ----- UTILS -----

function assignToObject(prop, target) {
	let serialized = prop.serialize()
	if (serialized !== undefined)
		target[prop.name] = serialized
}

var serialize = prop => prop.serialize()

var unwrapArray = array => array.length === 1 ? array[0] : array

var getNamespace = (ns, root) => root[ns] ? root[ns] : root[ns] = {}

function matchAll(string, regex) {
	let matches = []
	if (!string) return matches
	let match
	while ((match = regex.exec(string)) !== null)
		matches.push(match)
	return matches
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
	return value === null
		|| value === undefined
		|| value === 'null'
		|| value === 'undefined'
		|| value === ''
		|| value.trim() === ''
}