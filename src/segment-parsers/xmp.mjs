import {AppSegmentParserBase} from '../parser.mjs'
import {segmentParsers} from '../plugins.mjs'
import {undefinedIfEmpty} from '../util/helpers.mjs'
import {BufferView} from '../util/BufferView.mjs'


const XMP_CORE_HEADER     = 'http://ns.adobe.com/'
const XMP_MAIN_HEADER     = 'http://ns.adobe.com/xap/1.0/'
const XMP_EXTENDED_HEADER = 'http://ns.adobe.com/xmp/extension/'

// 2 bytes for markers + 2 bytes length
const TIFF_HEADER_LENGTH = 4
// Each XMP Extended segment starts with guid, length and offset (of its own, not just the one in TIFF header)
const XMP_EXTENDED_DATA_OFFSET = 79

export default class Xmp extends AppSegmentParserBase {

	static type = 'xmp'
	static multiSegment = true

	static canHandle(chunk, offset) {
		return chunk.getUint8(offset + 1) === 0xE1
			&& chunk.getUint32(offset + 4) === 0x68747470 // 'http'
			&& chunk.getString(offset + 4, XMP_CORE_HEADER.length) === XMP_CORE_HEADER
	}

	static headerLength(chunk, offset) {
		let headerString = chunk.getString(offset + 4, XMP_EXTENDED_HEADER.length)
		if (headerString === XMP_EXTENDED_HEADER)
			return XMP_EXTENDED_DATA_OFFSET
		else
			return TIFF_HEADER_LENGTH + XMP_MAIN_HEADER.length + 1 // 1 for null termination between header and data
	}

	static findPosition(chunk, offset) {
		let seg = super.findPosition(chunk, offset)
		// first is the main XMP, then the extended starts counting from 0.
		// We could determine that the XMP has extension if we looked for 'HasExtendedXMP'
		// but we don't want to read the segment here just yet.
		seg.multiSegment = seg.extended = seg.headerLength === XMP_EXTENDED_DATA_OFFSET
		if (seg.multiSegment) {
			seg.chunkCount  = chunk.getUint8(offset + 72)
			seg.chunkNumber = chunk.getUint8(offset + 76)
			// first and second chunk both have 0 as the chunk number.
			// the true first chunk (the one with <x:xmpme) has zeroes in the last two bytes of the chunk header.
			if (chunk.getUint8(offset + 77) !== 0) seg.chunkNumber++
		} else {
			// The main XMP segment is not numbered and we can't determine if there's any XMP Extended chunks without
			// parsing and looking for 'HasExtendedXMP'. We don't want to read in this simple due to 1) side effects
			// and 2) chunked reader. For now we can only tell "there's a possibility of more chunks"
			seg.chunkCount  = Infinity
			seg.chunkNumber = -1
		}
		return seg
	}

	static handleMultiSegments(allSegments) {
		return allSegments.map(seg => seg.chunk.getString()).join('')
	}

	// WARNING: XMP as IFD0 tag in TIFF can be either Uint8Array or string.
	// We need to be ready to accept any input data and turn it into string.
	normalizeInput(input) {
		return typeof input === 'string'
			? input
			: BufferView.from(input).getString()
	}

	// warning: The content may or may not be wrapped into <?xpacket.
	// So far i've seen all of these:
	// '<?xpacket><x:xmpmeta><rdf:RDF>'
	// '<?xpacket><rdf:RDF>'
	// '<x:xmpmeta><rdf:RDF>'

	parse(xmpString = this.chunk) {
		if (!this.localOptions.parse)
			return xmpString
		xmpString = idNestedTags(xmpString)
		let tags = XmlTag.findAll(xmpString, 'rdf', 'Description')
		if (tags.length === 0)
			tags.push(new XmlTag('rdf', 'Description', undefined, xmpString))
		let xmp = {}
		let namespace
		for (let tag of tags) {
			for (let prop of tag.properties) {
				namespace = getNamespace(prop.ns, xmp)
				assignToObject(prop, namespace)
			}
		}
		return pruneObject(xmp)
	}

	assignToOutput(root, xmp) {
		if (!this.localOptions.parse) {
			// xmp is not parsed, we include the string into output as is
			root.xmp = xmp
		} else {
			// properties are grouped into separate namespace objects
			// XMP TIFF namespace is merged into IFD0 block of TIFF segment
			// XMP EXIF namespace is merged into EXIF block of TIFF segment
			// All other namespaces are assigned
			for (let [ns, nsObject] of Object.entries(xmp)) {
				switch (ns) {
					case 'tiff':
						this.assignObjectToOutput(root, 'ifd0', nsObject)
						break
					case 'exif':
						this.assignObjectToOutput(root, 'exif', nsObject)
						break
					case 'xmlns':
						// XMLNS attributes aren't links but namespace identifiers in the URI form.
						// TLDR: It's a useless bullshit. Don't need it. Get over it.
						break
					default:
						this.assignObjectToOutput(root, ns, nsObject)
						break
				}
			}
		}
	}

}


// removes undefined properties and empty objects
function pruneObject(object) {
	let val
	for (let key in object) {
		val = object[key] = undefinedIfEmpty(object[key])
		if (val === undefined)
			delete object[key]
	}
	return undefinedIfEmpty(object)
}

segmentParsers.set('xmp', Xmp)


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
			var regex = new RegExp(`<(${ns}):(${name})(#\\d+)?((\\s+?[\\w\\d-:]+=("[^"]*"|'[^']*'))*\\s*)(\\/>|>([\\s\\S]*?)<\\/\\1:\\2\\3>)`, 'gm')
		} else {
			var regex = /<([\w\d-]+):([\w\d-]+)(#\d+)?((\s+?[\w\d-:]+=("[^"]*"|'[^']*'))*\s*)(\/>|>([\s\S]*?)<\/\1:\2\3>)/gm
		}
		return matchAll(xmpString, regex).map(XmlTag.unpackMatch)
	}

	static unpackMatch(match) {
		let ns = match[1]
		let name = match[2]
		let attrString = match[4]
		let innerXml = match[8]
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

	get isListItem() {
		return this.ns === 'rdf' && this.name === 'li'
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
		// sometimes <rdf:li> may have a single object-tag child. We need that object returned.
		if (this.isListItem && this.children.length === 1 && this.attrs.length === 0)
			return this.children[0].serialize()
		// process attributes and children tags into object
		let output = {}
		for (let prop of this.properties)
			assignToObject(prop, output)
		if (this.value !== undefined)
			output[VALUE_PROP] = this.value
		return undefinedIfEmpty(output)
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

const identifiableTags = [
	// Basic lists and items
	'rdf:li', 'rdf:Seq', 'rdf:Bag', 'rdf:Alt',
	// This is special case when list items can immediately contain nested rdf:Description
	// e.g. <rdf:Bag><rdf:li><rdf:Description mwg-rs:Name="additional data"><... actual inner tag ...></rdf:Description></rdf:li></rdf:Bag>
	'rdf:Description'
]
const nestedLiRegex = new RegExp(`(<|\\/)(${identifiableTags.join('|')})`, 'g')
export function idNestedTags(xmpString) {
	let stacks = {}
	let counts = {}
	for (let tag of identifiableTags) {
		stacks[tag] = []
		counts[tag] = 0
	}
	return xmpString.replace(nestedLiRegex, (match, prevChar, tag) => {
		if (prevChar === '<') {
			let id = ++counts[tag]
			stacks[tag].push(id)
			return `${match}#${id}`
		} else {
			let id = stacks[tag].pop()
			return `${match}#${id}`
		}
	})
}