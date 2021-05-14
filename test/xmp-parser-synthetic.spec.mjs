import {assert, getFile} from './test-util-core.mjs'
// FIXME: importing directly from src/ breaks bundle tests
import Xmp from '../src/segment-parsers/xmp.mjs'
import {XmlTag, normalizeValue, XmlAttr, idNestedTags} from '../src/segment-parsers/xmp.mjs'


const VALUE_PROP = 'value'

describe('Xmp - synthetic tests', () => {



	describe('primitive normalization', () => {

		it('zero', () => {
			assert.equal(normalizeValue('0'), 0)
		})

		it('float', () => {
			assert.equal(normalizeValue('1.42'), 1.42)
		})

		it('integer', () => {
			assert.equal(normalizeValue('50'), 50)
		})

		it('negative integer', () => {
			assert.equal(normalizeValue('-50'), -50)
		})

		// questionable, maybe hide behind options
		it('explicitly positive integer remains string', () => {
			// <crs:Brightness>+50</crs:Brightness>
			assert.equal(normalizeValue('+50'), '+50')
		})

		it('bools', () => {
			assert.equal(normalizeValue('true'), true)
			assert.equal(normalizeValue('false'), false)
		})

		it('Uppercase bools', () => {
			assert.equal(normalizeValue('True'), true) // <crs:AlreadyApplied>True</crs:AlreadyApplied>
			assert.equal(normalizeValue('False'), false)
		})

		it('empty string (length 0) becomes undefined', () => {
			assert.equal(normalizeValue(''), undefined)
		})

		it('empty string (with spaces) becomes undefined (due to trimming)', () => {
			assert.equal(normalizeValue('  '), undefined)
		})

		it('empty string (with tabs) becomes undefined (due to trimming)', () => {
			assert.equal(normalizeValue('\t\t'), undefined)
		})

	})


	describe('XmlAttr.findAll() regex matching & extraction', () => {

		describe(`=""`, () => {

			it(`finds single attr`, () => {
				assert.lengthOf(XmlAttr.findAll(`ns:name="abc"`), 1)
			})

			it(`finds multiple attr`, () => {
				assert.lengthOf(XmlAttr.findAll(`ns:name="abc" ns:second="def"`), 2)
			})

			it(`properly parses attribute`, () => {
				let match = XmlAttr.findAll(`namespace:name="value"`)[0]
				assert.equal(match.ns, 'namespace')
				assert.equal(match.name, 'name')
				assert.equal(match.value, 'value')
			})

			it(`properly parses empty string value as undefined`, () => {
				let match = XmlAttr.findAll(`namespace:name=""`)[0]
				assert.equal(match.ns, 'namespace')
				assert.equal(match.name, 'name')
				assert.equal(match.value, undefined)
			})

		})

		describe(`=''`, () => {

			it(`handles =''`, () => {
				assert.lengthOf(XmlAttr.findAll(`ns:name='abc'`), 1)
			})

			it(`handles multiple =''`, () => {
				assert.lengthOf(XmlAttr.findAll(`ns:name='abc' ns:second='def'`), 2)
			})

			it(`properly parses attribute`, () => {
				let match = XmlAttr.findAll(`namespace:name='value'`)[0]
				assert.equal(match.ns, 'namespace')
				assert.equal(match.name, 'name')
				assert.equal(match.value, 'value')
			})

			it(`properly parses empty string value as undefined`, () => {
				let match = XmlAttr.findAll(`namespace:name=''`)[0]
				assert.equal(match.ns, 'namespace')
				assert.equal(match.name, 'name')
				assert.equal(match.value, undefined)
			})

		})

		describe(`combination of ='' and =""`, () => {

			it(`finds two of ="" and  =''`, () => {
				assert.lengthOf(XmlAttr.findAll(`ns:first="abc" ns:second='def'`), 2)
			})

			it(`finds multiple ="" and  =''`, () => {
				assert.lengthOf(XmlAttr.findAll(`ns:first="abc" ns:second='true' ns:third="12.45" ns:fourth='123'`), 4)
			})

			it(`properly parses all attributes`, () => {
				let [match1, match2, match3] = XmlAttr.findAll(`foo:first="abc" bar:second='def'`)
				assert.equal(match1.ns, 'foo')
				assert.equal(match1.name, 'first')
				assert.equal(match1.value, 'abc')
				assert.equal(match2.ns, 'bar')
				assert.equal(match2.name, 'second')
				assert.equal(match2.value, 'def')
			})

		})

	})

	describe('XmlTag.findAll() regex matching & extraction', () => {

		describe(`simple tag with primitive`, () => {

			it(`has correct namespace and name`, () => {
				let [tag] = XmlTag.findAll(`<tiff:Make>Canon</tiff:Make>`)
				assert.equal(tag.ns, 'tiff')
				assert.equal(tag.name, 'Make')
			})

			it(`.children is empty`, () => {
				let [tag] = XmlTag.findAll(`<ns:name>Canon</ns:name>`)
				assert.isArray(tag.children)
				assert.lengthOf(tag.children, 0)
			})

			it(`.attrs is empty`, () => {
				let [tag] = XmlTag.findAll(`<ns:name>Canon</ns:name>`)
				assert.isArray(tag.attrs)
				assert.lengthOf(tag.attrs, 0)
			})

			it(`has correct value (string)`, () => {
				let [tag] = XmlTag.findAll(`<ns:name>Canon</ns:name>`)
				assert.strictEqual(tag.value, 'Canon')
			})

			it(`has correct value (integer)`, () => {
				let [tag] = XmlTag.findAll(`<ns:name>42</ns:name>`)
				assert.strictEqual(tag.value, 42)
			})

			it(`has correct value (float)`, () => {
				let [tag] = XmlTag.findAll(`<ns:name>0.04</ns:name>`)
				assert.strictEqual(tag.value, 0.04)
			})

			it(`has correct value (bool true)`, () => {
				let [tag] = XmlTag.findAll(`<ns:name>true</ns:name>`)
				assert.strictEqual(tag.value, true)
			})

			it(`has correct value (bool false)`, () => {
				let [tag] = XmlTag.findAll(`<ns:name>false</ns:name>`)
				assert.strictEqual(tag.value, false)
			})

			it(`empty string (0 length) value becomes undefined`, () => {
				let [tag] = XmlTag.findAll(`<ns:name></ns:name>`)
				assert.strictEqual(tag.value, undefined)
			})

			it(`empty string (with spaces) value becomes undefined`, () => {
				let [tag] = XmlTag.findAll(`<ns:name>  </ns:name>`)
				assert.strictEqual(tag.value, undefined)
			})

			it(`empty string (with tab) value becomes undefined`, () => {
				let [tag] = XmlTag.findAll(`<ns:name>	</ns:name>`)
				assert.strictEqual(tag.value, undefined)
			})

		})


		describe(`array tag`, () => {

			const code = `<ns:theArray><rdf:Seq><rdf:li>one</rdf:li><rdf:li>two</rdf:li></rdf:Seq></ns:theArray>`

			it(`has correct namespace and name`, () => {
				let [tag] = XmlTag.findAll(code)
				assert.equal(tag.ns, 'ns')
				assert.equal(tag.name, 'theArray')
			})

			it(`.attrs is empty`, () => {
				let [tag] = XmlTag.findAll(code)
				assert.isArray(tag.attrs)
				assert.lengthOf(tag.attrs, 0)
			})

			it(`.value is undefined`, () => {
				let [tag] = XmlTag.findAll(code)
				assert.isUndefined(tag.value)
			})

			it('has correct ammount of children (1)', () => {
				let [container] = XmlTag.findAll(`
				<ns:theArray><rdf:Seq>
					<rdf:li>the only item</rdf:li>
				</rdf:Seq></ns:theArray>`)
				let [array] = container.children
				assert.lengthOf(container.children, 1)
				assert.lengthOf(array.children, 1)
			})

			it('has correct ammount of children (2)', () => {
				let [container] = XmlTag.findAll(`
				<ns:theArray><rdf:Seq>
					<rdf:li>one</rdf:li>
					<rdf:li>two</rdf:li>
				</rdf:Seq></ns:theArray>`)
				let [array] = container.children
				assert.lengthOf(container.children, 1)
				assert.lengthOf(array.children, 2)
			})

			it('has correct ammount of children (4)', () => {
				let [container] = XmlTag.findAll(`
				<ns:theArray><rdf:Seq>
					<rdf:li>one</rdf:li>
					<rdf:li>2</rdf:li>
					<rdf:li ns:foo="bar"/>
					<rdf:li>four</rdf:li>
					<rdf:li ns:baz="quo"/>
				</rdf:Seq></ns:theArray>`)
				let [array] = container.children
				assert.lengthOf(container.children, 1)
				assert.lengthOf(array.children, 5)
			})

		})


		describe(`object tag`, () => {

			describe(`with attributes, no children`, () => {
				const code = `
				<ns:theObject
				ns:attrString="the attr string"
				ns:attrInteger="42"
				ns:attrFloat="0.04"
				ns:attrBoolTrue="true"
				ns:attrBoolFalse="false"/>`

				it(`.children is empty`, () => {
					let [tag] = XmlTag.findAll(code)
					assert.isArray(tag.children)
					assert.lengthOf(tag.children, 0)
				})

				it(`.attrs contains correct attributes`, () => {
					let [tag] = XmlTag.findAll(code)
					assert.isArray(tag.attrs)
					assert.lengthOf(tag.attrs, 5)
				})

				it(`.value is undefined`, () => {
					let [tag] = XmlTag.findAll(code)
					assert.isUndefined(tag.value)
				})

				it(`attributes have correct values`, () => {
					let [tag] = XmlTag.findAll(code)
					let findAttr = attrName => tag.attrs.find(attr => attr.name === attrName)
					assert.strictEqual(findAttr('attrString').value, 'the attr string')
					assert.strictEqual(findAttr('attrFloat').value, 0.04)
					assert.strictEqual(findAttr('attrInteger').value, 42)
					assert.strictEqual(findAttr('attrBoolTrue').value, true)
					assert.strictEqual(findAttr('attrBoolFalse').value, false)
				})

			})



			describe(`with primitive tag children, no attributes`, () => {
				const code = `
				<ns:theObject>
					<ns:tagString>the tag string</ns:tagString>
					<ns:tagFloat>0.99</ns:tagFloat>
					<ns:tagInteger>11</ns:tagInteger>
					<ns:tagBoolTrue>true</ns:tagBoolTrue>
					<ns:tagBoolFalse>false</ns:tagBoolFalse>
				</ns:theObject>`

				it(`.children contains correct children`, () => {
					let [tag] = XmlTag.findAll(code)
					assert.isArray(tag.children)
					assert.lengthOf(tag.children, 5)
				})

				it(`.attrs is empty`, () => {
					let [tag] = XmlTag.findAll(code)
					assert.isArray(tag.attrs)
					assert.lengthOf(tag.attrs, 0)
				})

				it(`.value is undefined`, () => {
					let [tag] = XmlTag.findAll(code)
					assert.isUndefined(tag.value)
				})

				it(`children have correct values`, () => {
					let [tag] = XmlTag.findAll(code)
					let findChild = attrName => tag.children.find(tag => tag.name === attrName)
					assert.strictEqual(findChild('tagString').value, 'the tag string')
					assert.strictEqual(findChild('tagFloat').value, 0.99)
					assert.strictEqual(findChild('tagInteger').value, 11)
					assert.strictEqual(findChild('tagBoolTrue').value, true)
					assert.strictEqual(findChild('tagBoolFalse').value, false)
				})

			})

			describe(`mixed attrs and children`, () => {
				const code = `
				<ns:theObject
				ns:attrString="the attr string"
				ns:attrInteger="42"
				ns:attrFloat="0.04"
				ns:attrBoolTrue="true"
				ns:attrBoolFalse="false">
					<ns:tagString>the tag string</ns:tagString>
					<ns:tagFloat>0.99</ns:tagFloat>
					<ns:tagInteger>11</ns:tagInteger>
					<ns:tagBoolTrue>true</ns:tagBoolTrue>
					<ns:tagBoolFalse>false</ns:tagBoolFalse>
				</ns:theObject>`

				it(`.children contains correct children`, () => {
					let [tag] = XmlTag.findAll(code)
					assert.isArray(tag.children)
					assert.lengthOf(tag.children, 5)
				})

				it(`.attrs contains correct attributes`, () => {
					let [tag] = XmlTag.findAll(code)
					assert.isArray(tag.attrs)
					assert.lengthOf(tag.attrs, 5)
				})

				it(`.value is undefined`, () => {
					let [tag] = XmlTag.findAll(code)
					assert.isUndefined(tag.value)
				})

				it(`attributes and children have correct values`, () => {
					let [tag] = XmlTag.findAll(code)
					let findAttr = attrName => tag.attrs.find(attr => attr.name === attrName)
					let findChild = attrName => tag.children.find(tag => tag.name === attrName)
					assert.strictEqual(findAttr('attrString').value, 'the attr string')
					assert.strictEqual(findAttr('attrFloat').value, 0.04)
					assert.strictEqual(findAttr('attrInteger').value, 42)
					assert.strictEqual(findAttr('attrBoolTrue').value, true)
					assert.strictEqual(findAttr('attrBoolFalse').value, false)
					assert.strictEqual(findChild('tagString').value, 'the tag string')
					assert.strictEqual(findChild('tagFloat').value, 0.99)
					assert.strictEqual(findChild('tagInteger').value, 11)
					assert.strictEqual(findChild('tagBoolTrue').value, true)
					assert.strictEqual(findChild('tagBoolFalse').value, false)
				})

			})

			describe('mixed attrs and primitive value', () => {

				it('object tag with value 1', () => {
					let [tag] = XmlTag.findAll(`
						<ns:tagObject ns:objString="the string">42</ns:tagObject>
					`)
					assert.equal(tag.name, 'tagObject')
					assert.equal(tag.properties[0].name, 'objString')
					assert.equal(tag.properties[0].value, 'the string')
					assert.strictEqual(tag.value, 42)
				})

				it('object tag with value 2', () => {
					let [tag] = XmlTag.findAll(`
						<ns:tagObject
						ns:objString="the string"
						ns:objBool="true">
							0.78
						</ns:tagObject>
					`)
					assert.equal(tag.name, 'tagObject')
					assert.equal(tag.properties[0].name, 'objString')
					assert.equal(tag.properties[0].value, 'the string')
					assert.equal(tag.properties[1].name, 'objBool')
					assert.equal(tag.properties[1].value, true)
					assert.strictEqual(tag.value, 0.78)
				})

				it('object tag with value 3', () => {
					let [tag] = XmlTag.findAll(`
						<ns:tagObject
						ns:objString="attrval"
						ns:objNumber="42">
							children string
						</ns:tagObject>
					`)
					assert.equal(tag.name, 'tagObject')
					assert.equal(tag.properties[0].name, 'objString')
					assert.equal(tag.properties[0].value, 'attrval')
					assert.equal(tag.properties[1].name, 'objNumber')
					assert.equal(tag.properties[1].value, 42)
					assert.strictEqual(tag.value, 'children string')
				})

			})

		})

		describe('newlines & spaces', () => {

			it('multiline, self closing tag', () => {
				let [tag] = XmlTag.findAll(`
					<xmpMM:DerivedFrom
						stRef:documentID="attrval1"
						stRef:originalDocumentID="attrval2"
					/>
				`)
				assert.equal(tag.ns, 'xmpMM')
				assert.equal(tag.name, 'DerivedFrom')
				assert.equal(tag.attrs[0].name, 'documentID')
				assert.equal(tag.attrs[1].name, 'originalDocumentID')
				assert.equal(tag.attrs[0].value, 'attrval1')
				assert.equal(tag.attrs[1].value, 'attrval2')
				assert.isUndefined(tag.value)
			})

			it('multiline, pair tags', () => {
				let [tag] = XmlTag.findAll(`
					<xmpMM:DerivedFrom
						stRef:documentID="attrval1"
						stRef:originalDocumentID="attrval2"
					></xmpMM:DerivedFrom>
				`)
				assert.equal(tag.ns, 'xmpMM')
				assert.equal(tag.name, 'DerivedFrom')
				assert.equal(tag.attrs[0].name, 'documentID')
				assert.equal(tag.attrs[1].name, 'originalDocumentID')
				assert.equal(tag.attrs[0].value, 'attrval1')
				assert.equal(tag.attrs[1].value, 'attrval2')
				assert.isUndefined(tag.value)
			})

			it('multiline, pair tags with attributes and children', () => {
				let [tag] = XmlTag.findAll(`
					<xmpMM:DerivedFrom
						stRef:documentID="attrval1"
						stRef:originalDocumentID="attrval2"
					>the content</xmpMM:DerivedFrom>
				`)
				assert.equal(tag.ns, 'xmpMM')
				assert.equal(tag.name, 'DerivedFrom')
				assert.equal(tag.attrs[0].name, 'documentID')
				assert.equal(tag.attrs[1].name, 'originalDocumentID')
				assert.equal(tag.attrs[0].value, 'attrval1')
				assert.equal(tag.attrs[1].value, 'attrval2')
				assert.equal(tag.value, 'the content')
			})

			it('all on one line, self closing tag', () => {
				let [tag] = XmlTag.findAll(`<xmpMM:DerivedFrom stRef:documentID="attrval1" stRef:originalDocumentID="attrval2"/>`)
				assert.equal(tag.ns, 'xmpMM')
				assert.equal(tag.name, 'DerivedFrom')
				assert.equal(tag.attrs[0].name, 'documentID')
				assert.equal(tag.attrs[1].name, 'originalDocumentID')
				assert.equal(tag.attrs[0].value, 'attrval1')
				assert.equal(tag.attrs[1].value, 'attrval2')
				assert.isUndefined(tag.value)
			})

			it('all on one line, pair tags', () => {
				let [tag] = XmlTag.findAll(`<xmpMM:DerivedFrom stRef:documentID="attrval1" stRef:originalDocumentID="attrval2"></xmpMM:DerivedFrom>`)
				assert.equal(tag.ns, 'xmpMM')
				assert.equal(tag.name, 'DerivedFrom')
				assert.equal(tag.attrs[0].name, 'documentID')
				assert.equal(tag.attrs[1].name, 'originalDocumentID')
				assert.equal(tag.attrs[0].value, 'attrval1')
				assert.equal(tag.attrs[1].value, 'attrval2')
				assert.isUndefined(tag.value)
			})

			it('all on one line, pair tags with attributes and children', () => {
				let [tag] = XmlTag.findAll(`<xmpMM:DerivedFrom stRef:documentID="attrval1" stRef:originalDocumentID="attrval2">the content</xmpMM:DerivedFrom>`)
				assert.equal(tag.ns, 'xmpMM')
				assert.equal(tag.name, 'DerivedFrom')
				assert.equal(tag.attrs[0].name, 'documentID')
				assert.equal(tag.attrs[1].name, 'originalDocumentID')
				assert.equal(tag.attrs[0].value, 'attrval1')
				assert.equal(tag.attrs[1].value, 'attrval2')
				assert.equal(tag.value, 'the content')
			})

		})

		describe('meta wrappers are ignored', () => {

			it(`?xpacket > rdf:RDF > rdf:Description > data object`, () => {
				let matches = XmlTag.findAll(`
					<?xpacket>
						<rdf:RDF>
							<rdf:Description rdf:about='' xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>
								<tiff:Make>Canon</tiff:Make>
								<tiff:Model>Canon EOS 550D</tiff:Model>
							</rdf:Description>
						</rdf:RDF>
					</?xpacket>
				`)
				assert.lengthOf(matches, 1)
				assert.equal(matches[0].ns, 'rdf')
				assert.equal(matches[0].name, 'RDF')
			})

			it(`rdf:RDF > rdf:Description > data object`, () => {
				let matches = XmlTag.findAll(`
					<rdf:RDF>
						<rdf:Description rdf:about='' xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>
							<tiff:Make>Canon</tiff:Make>
							<tiff:Model>Canon EOS 550D</tiff:Model>
						</rdf:Description>
					</rdf:RDF>
				`)
				assert.lengthOf(matches, 1)
				assert.equal(matches[0].ns, 'rdf')
				assert.equal(matches[0].name, 'RDF')
			})

			it(`rdf:Description (with '') > data object`, () => {
				let matches = XmlTag.findAll(`
					<rdf:Description xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>
						<tiff:Make>Canon</tiff:Make>
						<tiff:Model>Canon EOS 550D</tiff:Model>
					</rdf:Description>
				`)
				assert.lengthOf(matches, 1)
				assert.equal(matches[0].ns, 'rdf')
				assert.equal(matches[0].name, 'Description')
			})

			it(`rdf:Description (with "") > data object`, () => {
				let matches = XmlTag.findAll(`
					<rdf:Description xmlns:tiff="http://ns.adobe.com/tiff/1.0/">
						<tiff:Make>Canon</tiff:Make>
						<tiff:Model>Canon EOS 550D</tiff:Model>
					</rdf:Description>
				`)
				assert.lengthOf(matches, 1)
				assert.equal(matches[0].ns, 'rdf')
				assert.equal(matches[0].name, 'Description')
			})

			it(`tag with empty string attribute`, () => {
				let matches = XmlTag.findAll(`
					<rdf:Description rdf:about="">
						<tiff:Make>Canon</tiff:Make>
						<tiff:Model>Canon EOS 550D</tiff:Model>
					</rdf:Description>
				`)
				assert.lengthOf(matches, 1)
				assert.equal(matches[0].ns, 'rdf')
				assert.equal(matches[0].name, 'Description')
			})

			it(`does not match plain string`, () => {
				let matches = XmlTag.findAll(`Canon EOS 550D`)
				assert.lengthOf(matches, 0)
			})
		})

	})



	describe('XmlTag.serialize()', () => {

		describe('simple tag', () => {

			it(`serializes primitive string value as the same string`, () => {
				let [tag] = XmlTag.findAll(`<ns:name>Canon</ns:name>`)
				assert.strictEqual(tag.serialize(), 'Canon')
			})

			it(`serializes primitive number value as the same number`, () => {
				let [tag] = XmlTag.findAll(`<ns:name>42</ns:name>`)
				assert.strictEqual(tag.serialize(), 42)
			})

			it(`serializes primitive bool value as the same bool`, () => {
				let [tag] = XmlTag.findAll(`<ns:name>False</ns:name>`)
				assert.strictEqual(tag.serialize(), false)
			})

			it(`serializes empty string as undefined`, () => {
				let [tag] = XmlTag.findAll(`<ns:name></ns:name>`)
				assert.isUndefined(tag.serialize())
			})

		})

		describe('array tag', () => {

			it(`serialize as the first item instead of array, if there's just one item`, () => {
				let [tag] = XmlTag.findAll(`
				<ns:theArray><rdf:Seq>
					<rdf:li>the only item</rdf:li>
				</rdf:Seq></ns:theArray>`)
				assert.equal(tag.serialize(), 'the only item')
			})

			it('has correct ammount items (2)', () => {
				let [tag] = XmlTag.findAll(`
				<ns:theArray><rdf:Seq>
					<rdf:li>one</rdf:li>
					<rdf:li>two</rdf:li>
				</rdf:Seq></ns:theArray>`)
				assert.lengthOf(tag.serialize(), 2)
			})

			it('has correct ammount items (4)', () => {
				let [tag] = XmlTag.findAll(`
				<ns:theArray><rdf:Seq>
					<rdf:li>one</rdf:li>
					<rdf:li>2</rdf:li>
					<rdf:li ns:foo="bar"/>
					<rdf:li>four</rdf:li>
					<rdf:li ns:baz="quo"/>
				</rdf:Seq></ns:theArray>`)
				assert.lengthOf(tag.serialize(), 5)
			})

			it('items have correct types: string', () => {
				let [tag] = XmlTag.findAll(`<ns:theArray><rdf:Seq><rdf:li>one</rdf:li><rdf:li>two</rdf:li></rdf:Seq></ns:theArray>`)
				let serialized = tag.serialize()
				assert.strictEqual(serialized[0], 'one')
				assert.strictEqual(serialized[1], 'two')
			})

			it('items have correct types: bool - false', () => {
				let [tag] = XmlTag.findAll(`<ns:theArray><rdf:Seq><rdf:li>false</rdf:li><rdf:li>false</rdf:li></rdf:Seq></ns:theArray>`)
				let serialized = tag.serialize()
				assert.strictEqual(serialized[0], false)
				assert.strictEqual(serialized[1], false)
			})

			it('items have correct types: bool - true', () => {
				let [tag] = XmlTag.findAll(`<ns:theArray><rdf:Seq><rdf:li>true</rdf:li><rdf:li>true</rdf:li></rdf:Seq></ns:theArray>`)
				let serialized = tag.serialize()
				assert.strictEqual(serialized[0], true)
				assert.strictEqual(serialized[1], true)
			})

			it('items have correct types: integer', () => {
				let [tag] = XmlTag.findAll(`<ns:theArray><rdf:Seq><rdf:li>11</rdf:li><rdf:li>22</rdf:li></rdf:Seq></ns:theArray>`)
				let serialized = tag.serialize()
				assert.strictEqual(serialized[0], 11)
				assert.strictEqual(serialized[1], 22)
			})

			it('items have correct types: float', () => {
				let [tag] = XmlTag.findAll(`<ns:theArray><rdf:Seq><rdf:li>1.1</rdf:li><rdf:li>2.2</rdf:li></rdf:Seq></ns:theArray>`)
				let serialized = tag.serialize()
				assert.strictEqual(serialized[0], 1.1)
				assert.strictEqual(serialized[1], 2.2)
			})

			it('items have correct types: mixed', () => {
				let [tag] = XmlTag.findAll(`
					<ns:theArray>
						<rdf:Seq>
							<rdf:li>one</rdf:li>
							<rdf:li>31</rdf:li>
							<rdf:li ns:foo="bar"/>
							<rdf:li>0.98</rdf:li>
							<rdf:li>true</rdf:li>
							<rdf:li>six</rdf:li>
							<rdf:li ns:baz="quo"/>
							<rdf:li>false</rdf:li>
						</rdf:Seq><
					/ns:theArray>
				`)
				let serialized = tag.serialize()
				assert.lengthOf(serialized, 8)
				assert.strictEqual(serialized[0], 'one')
				assert.strictEqual(serialized[1], 31)
				assert.isObject(serialized[2])
				assert.strictEqual(serialized[3], 0.98)
				assert.strictEqual(serialized[4], true)
				assert.strictEqual(serialized[5], 'six')
				assert.isObject(serialized[6])
				assert.strictEqual(serialized[7], false)
			})

			it('serialized array of objects has correct output', () => {
				let [tag] = XmlTag.findAll(`
					<ns:theArray>
						<rdf:Seq>
							<rdf:li>
								<ns:tagString>first item</ns:tagString>
								<ns:tagInteger>67</ns:tagInteger>
							</rdf:li>
							<rdf:li ns:foo="bar" ns:baz="quo"/>
							<rdf:li ns:tagString="third item">
								<ns:tagString>another string</ns:tagString>
								<ns:tagBool>false</ns:tagBool>
							</rdf:li>
						</rdf:Seq><
					/ns:theArray>
				`)
				let serialized = tag.serialize()
				assert.lengthOf(serialized, 3)
				assert.deepEqual(serialized[0], {tagString: 'first item', tagInteger: 67})
				assert.deepEqual(serialized[1], {foo: 'bar', baz: 'quo'})
				assert.deepEqual(serialized[2], {tagString: 'third item', tagString: 'another string', tagBool: false})
			})

			for (let tagName of ['rdf:Seq', 'rdf:Bag', 'rdf:Alt']) {

				it(`${tagName} is single value if it has only one item`, () => {
					let [tag] = XmlTag.findAll(`
						<ns:tagArray>
							<${tagName}>
								<rdf:li>single value</rdf:li>
							</${tagName}>
						</ns:tagArray>
					`)
					assert.equal(tag.serialize(), 'single value')
				})

				it(`${tagName} is array if it has two or more items`, () => {
					let [tag] = XmlTag.findAll(`
						<ns:tagArray>
							<${tagName}>
								<rdf:li>one</rdf:li>
								<rdf:li>two</rdf:li>
							</${tagName}>
						</ns:tagArray>
					`)
					assert.isArray(tag.serialize())
				})

			}

		})


		describe(`object tag`, () => {

			it(`undefined value is not stored as explicit undefined property`, () => {
				let [tag] = XmlTag.findAll(`<rdf:Description ns:undefinedAttr="">
					<ns:undefinedTag></ns:undefinedTag>
					<ns:definedTag>some string</ns:definedTag>
				</rdf:Description>`)
				let serialized = tag.serialize()
				assert.isObject(serialized)
				assert.isUndefined(serialized.undefinedAttr)
				assert.isUndefined(serialized.undefinedTag)
				assert.doesNotHaveAnyKeys(serialized, ['undefinedAttr', 'undefinedTag'])
			})

			it(`empty object is serialized to undefined`, () => {
				let [tag] = XmlTag.findAll(`<rdf:Description ns:undefinedAttr="">
					<ns:undefinedTag></ns:undefinedTag>
				</rdf:Description>`)
				let serialized = tag.serialize()
				assert.isUndefined(serialized)
			})

			describe(`with attributes, no children`, () => {
				const code = `
				<ns:theObject
				ns:attrString="the attr string"
				ns:attrInteger="42"
				ns:attrFloat="0.04"
				ns:attrBoolTrue="true"
				ns:attrBoolFalse="false"/>`

				it(`serializes as object`, () => {
					let [tag] = XmlTag.findAll(code)
					assert.typeOf(tag.serialize(), 'object')
				})

				it(`serialized object has all the attributes (and only them) as properties`, () => {
					let [tag] = XmlTag.findAll(code)
					assert.hasAllKeys(tag.serialize(), ['attrString', 'attrInteger', 'attrFloat', 'attrBoolTrue', 'attrBoolFalse']) 
				})

				it(`serialized object correct contains correct values`, () => {
					let [tag] = XmlTag.findAll(code)
					let serialized = tag.serialize()
					assert.strictEqual(serialized.attrString, 'the attr string')
					assert.strictEqual(serialized.attrFloat, 0.04)
					assert.strictEqual(serialized.attrInteger, 42)
					assert.strictEqual(serialized.attrBoolTrue, true)
					assert.strictEqual(serialized.attrBoolFalse, false)
				})

			})

			describe(`with primitive tag children, no attributes`, () => {
				const code = `
				<ns:theObject>
					<ns:tagString>the tag string</ns:tagString>
					<ns:tagFloat>0.99</ns:tagFloat>
					<ns:tagInteger>11</ns:tagInteger>
					<ns:tagBoolTrue>true</ns:tagBoolTrue>
					<ns:tagBoolFalse>false</ns:tagBoolFalse>
				</ns:theObject>`

				it(`serializes as object`, () => {
					let [tag] = XmlTag.findAll(code)
					assert.typeOf(tag.serialize(), 'object')
				})

				it(`serialized object has all the children (and only them) as properties`, () => {
					let [tag] = XmlTag.findAll(code)
					assert.hasAllKeys(tag.serialize(), ['tagString', 'tagInteger', 'tagFloat', 'tagBoolTrue', 'tagBoolFalse']) 
				})

				it(`serialized object correct contains correct values`, () => {
					let [tag] = XmlTag.findAll(code)
					let serialized = tag.serialize()
					assert.strictEqual(serialized.tagString, 'the tag string')
					assert.strictEqual(serialized.tagFloat, 0.99)
					assert.strictEqual(serialized.tagInteger, 11)
					assert.strictEqual(serialized.tagBoolTrue, true)
					assert.strictEqual(serialized.tagBoolFalse, false)
				})

			})



			describe(`mixed attrs and children`, () => {
				const code = `
				<ns:theObject
				ns:attrString="the attr string"
				ns:attrInteger="42"
				ns:attrFloat="0.04"
				ns:attrBoolTrue="true"
				ns:attrBoolFalse="false">
					<ns:tagString>the tag string</ns:tagString>
					<ns:tagFloat>0.99</ns:tagFloat>
					<ns:tagInteger>11</ns:tagInteger>
					<ns:tagBoolTrue>true</ns:tagBoolTrue>
					<ns:tagBoolFalse>false</ns:tagBoolFalse>
				</ns:theObject>`

				it(`serializes as object`, () => {
					let [tag] = XmlTag.findAll(code)
					assert.typeOf(tag.serialize(), 'object')
				})

				it(`serialized object has all the attributes and children (and only them) as properties`, () => {
					let [tag] = XmlTag.findAll(code)
					assert.hasAllKeys(tag.serialize(), [
						'attrString', 'attrInteger', 'attrFloat', 'attrBoolTrue', 'attrBoolFalse',
						'tagString', 'tagInteger', 'tagFloat', 'tagBoolTrue', 'tagBoolFalse',
					]) 
				})

				it(`serialized object correct contains correct values`, () => {
					let [tag] = XmlTag.findAll(code)
					let serialized = tag.serialize()
					assert.strictEqual(serialized.attrString, 'the attr string')
					assert.strictEqual(serialized.attrFloat, 0.04)
					assert.strictEqual(serialized.attrInteger, 42)
					assert.strictEqual(serialized.attrBoolTrue, true)
					assert.strictEqual(serialized.attrBoolFalse, false)
					assert.strictEqual(serialized.tagString, 'the tag string')
					assert.strictEqual(serialized.tagFloat, 0.99)
					assert.strictEqual(serialized.tagInteger, 11)
					assert.strictEqual(serialized.tagBoolTrue, true)
					assert.strictEqual(serialized.tagBoolFalse, false)
				})

			})

		})

		describe('compounds & complex', () => {

			it('attrs + primitive tags', () => {
				let [tag] = XmlTag.findAll(`
					<rdf:Description
					ns:attrString="the attr string"
					ns:attrBoolTrue="true"
					ns:attrBoolFalse="false"
					ns:attrInteger="42"
					ns:attrFloat="0.04">
						<ns:tagString>the tag string</ns:tagString>
						<ns:tagFloat>0.04</ns:tagFloat>
						<ns:tagInteger>42</ns:tagInteger>
						<ns:tagBoolTrue>true</ns:tagBoolTrue>
						<ns:tagBoolFalse>false</ns:tagBoolFalse>
					</rdf:Description>
				`)
				let serialized = tag.serialize()
				assert.strictEqual(serialized.attrString, 'the attr string')
				assert.strictEqual(serialized.attrFloat, 0.04)
				assert.strictEqual(serialized.attrInteger, 42)
				assert.strictEqual(serialized.attrBoolTrue, true)
				assert.strictEqual(serialized.attrBoolFalse, false)
				assert.strictEqual(serialized.tagString, 'the tag string')
				assert.strictEqual(serialized.tagFloat, 0.04)
				assert.strictEqual(serialized.tagInteger, 42)
				assert.strictEqual(serialized.tagBoolTrue, true)
				assert.strictEqual(serialized.tagBoolFalse, false)
			})

			it('attrs + array tag', () => {
				let [tag] = XmlTag.findAll(`
					<rdf:Description
					ns:attrString="the attr string"
					ns:attrInteger="42">
						<ns:tagArray>
							<rdf:Seq>
								<rdf:li>one</rdf:li>
								<rdf:li>two</rdf:li>
							</rdf:Seq>
						</ns:tagArray>
					</rdf:Description>
				`)
				let serialized = tag.serialize()
				assert.strictEqual(serialized.attrString, 'the attr string')
				assert.strictEqual(serialized.attrInteger, 42)
				assert.isArray(serialized.tagArray)
				assert.lengthOf(serialized.tagArray, 2)
				assert.deepEqual(serialized.tagArray, ['one', 'two'])
			})

			it('primitive tags + array tag', () => {
				let [tag] = XmlTag.findAll(`
					<rdf:Description>
						<ns:tagFloat>0.04</ns:tagFloat>
						<ns:tagBoolTrue>true</ns:tagBoolTrue>
						<ns:tagArray>
							<rdf:Seq>
								<rdf:li>one</rdf:li>
								<rdf:li>two</rdf:li>
							</rdf:Seq>
						</ns:tagArray>
					</rdf:Description>
				`)
				let serialized = tag.serialize()
				assert.strictEqual(serialized.tagFloat, 0.04)
				assert.strictEqual(serialized.tagBoolTrue, true)
				assert.isArray(serialized.tagArray)
				assert.lengthOf(serialized.tagArray, 2)
				assert.deepEqual(serialized.tagArray, ['one', 'two'])
			})

			it('attrs + primitive tags + array tag', () => {
				let [tag] = XmlTag.findAll(`
					<rdf:Description
					ns:attrString="the attr string"
					ns:attrInteger="42">
						<ns:tagFloat>0.04</ns:tagFloat>
						<ns:tagBoolTrue>true</ns:tagBoolTrue>
						<ns:tagArray>
							<rdf:Seq>
								<rdf:li>one</rdf:li>
								<rdf:li>two</rdf:li>
							</rdf:Seq>
						</ns:tagArray>
					</rdf:Description>
				`)
				let serialized = tag.serialize()
				assert.strictEqual(serialized.attrString, 'the attr string')
				assert.strictEqual(serialized.attrInteger, 42)
				assert.strictEqual(serialized.tagFloat, 0.04)
				assert.strictEqual(serialized.tagBoolTrue, true)
				assert.isArray(serialized.tagArray)
				assert.lengthOf(serialized.tagArray, 2)
				assert.deepEqual(serialized.tagArray, ['one', 'two'])
			})

			it('attrs + object tag', () => {
				let [tag] = XmlTag.findAll(`
					<rdf:Description
					ns:attrString="the attr string"
					ns:attrInteger="42">
						<ns:theObject ns:action="derived" ns:parameters="saved to new location"/>
					</rdf:Description>
				`)
				let serialized = tag.serialize()
				assert.hasAllKeys(serialized, ['attrString', 'attrInteger', 'theObject'])
				assert.hasAllKeys(serialized.theObject, ['action', 'parameters'])
			})

			it('attrs + two object tags', () => {
				let [tag] = XmlTag.findAll(`
					<rdf:Description
					ns:attrString="the attr string"
					ns:attrInteger="42">
						<ns:firstObject ns:string="derived" ns:integer="42"></ns:firstObject>
						<ns:secondObject ns:bool="false" ns:float="0.42" />
					</rdf:Description>
				`)
				let serialized = tag.serialize()
				assert.hasAllKeys(serialized, ['attrString', 'attrInteger', 'firstObject', 'secondObject'])
				assert.hasAllKeys(serialized.firstObject, ['string', 'integer'])
				assert.hasAllKeys(serialized.secondObject, ['bool', 'float'])
			})

			it('primitive tags + object tag', () => {
				let [tag] = XmlTag.findAll(`
					<rdf:Description>
						<ns:tagString>the attr string</ns:tagString>
						<ns:tagInteger>42</ns:tagInteger>
						<ns:theObject ns:action="derived" ns:parameters="saved to new location"/>
					</rdf:Description>
				`)
				let serialized = tag.serialize()
				assert.hasAllKeys(serialized, ['tagString', 'tagInteger', 'theObject'])
				assert.hasAllKeys(serialized.theObject, ['action', 'parameters'])
			})

			it('primitive tags + two object tags', () => {
				let [tag] = XmlTag.findAll(`
					<rdf:Description>
						<ns:tagString>the attr string</ns:tagString>
						<ns:tagInteger>42</ns:tagInteger>
						<ns:firstObject ns:string="derived" ns:integer="42"></ns:firstObject>
						<ns:secondObject ns:bool="false" ns:float="0.42" />
					</rdf:Description>
				`)
				let serialized = tag.serialize()
				assert.hasAllKeys(serialized, ['tagString', 'tagInteger', 'firstObject', 'secondObject'])
				assert.hasAllKeys(serialized.firstObject, ['string', 'integer'])
				assert.hasAllKeys(serialized.secondObject, ['bool', 'float'])
			})

			it('primitive tags + attrs + two object tags', () => {
				let [tag] = XmlTag.findAll(`
					<rdf:Description
					ns:attrString="the attr string"
					ns:attrInteger="42">
						<ns:tagString>the attr string</ns:tagString>
						<ns:tagInteger>42</ns:tagInteger>
						<ns:firstObject ns:string="derived" ns:integer="42"></ns:firstObject>
						<ns:secondObject ns:bool="false" ns:float="0.42" />
					</rdf:Description>
				`)
				let serialized = tag.serialize()
				assert.hasAllKeys(serialized, ['attrString', 'attrInteger', 'tagString', 'tagInteger', 'firstObject', 'secondObject'])
				assert.hasAllKeys(serialized.firstObject, ['string', 'integer'])
				assert.hasAllKeys(serialized.secondObject, ['bool', 'float'])
			})

			it('array of objects', () => {
				let [tag] = XmlTag.findAll(`
					<rdf:Description>
						<ns:arrayOfObjects>
							<rdf:Seq>
								<rdf:li ns:objString="one" ns:objInteger="1"/>
								<rdf:li ns:objFloat="0.42" ns:objBool="true"></rdf:li>
							</rdf:Seq>
						</ns:arrayOfObjects>
					</rdf:Description>
				`)
				let serialized = tag.serialize()
				assert.hasAllKeys(serialized, ['arrayOfObjects'])
				assert.lengthOf(serialized.arrayOfObjects, 2)
				assert.hasAllKeys(serialized.arrayOfObjects[0], ['objString', 'objInteger'])
				assert.hasAllKeys(serialized.arrayOfObjects[1], ['objFloat', 'objBool'])
			})

			// very oppinionated
			it('array with single property of object', () => {
				let [tag] = XmlTag.findAll(`
					<Container:Directory>
						<rdf:Seq>
						<rdf:li>
							<Container:Item Item:Mime="image/jpeg" Item:Length="0" Item:DataURI="primary_image"/>
						</rdf:li>
						<rdf:li>
							<Container:Item Item:Mime="image/jpeg" Item:Length="2420326" Item:DataURI="android/original_image"/>
						</rdf:li>
						<rdf:li>
							<Container:Item Item:Mime="image/jpeg" Item:Length="135047" Item:DataURI="android/depthmap"/>
						</rdf:li>
						<rdf:li>
							<Container:Item Item:Mime="image/jpeg" Item:Length="96395" Item:DataURI="android/confidencemap"/>
						</rdf:li>
						</rdf:Seq>
					</Container:Directory>
				`)
				let serialized = tag.serialize()
				assert.lengthOf(serialized, 4)
				assert.isObject(serialized[0])
				assert.isUndefined(serialized[0].Item)
				assert.isUndefined(serialized[0].Item)
				assert.equal(serialized[0].Mime, 'image/jpeg')
				assert.equal(serialized[0].Length, 0)
				assert.equal(serialized[0].DataURI, 'primary_image')
			})

		})

		describe('stress-tests', () => {

			it('attrs + primitive tags + object tags + array of objects', () => {
				let [tag] = XmlTag.findAll(`
					<rdf:Description
					ns:attrString="the attr string"
					ns:attrBoolTrue="true"
					ns:attrBoolFalse="false"
					ns:attrInteger="42"
					ns:attrFloat="0.04">
						<ns:tagString>the tag string</ns:tagString>
						<ns:tagFloat>0.04</ns:tagFloat>
						<ns:tagInteger>42</ns:tagInteger>
						<ns:tagBoolTrue>true</ns:tagBoolTrue>
						<ns:tagBoolFalse>false</ns:tagBoolFalse>
						<ns:arrayOfObjects>
							<rdf:Seq>
								<rdf:li ns:objString="one" ns:objInteger="1"/>
								<rdf:li ns:objFloat="0.42" ns:objBool="true"></rdf:li>
								<rdf:li ns:objString="three" ns:objBool="false"/>
							</rdf:Seq>
						</ns:arrayOfObjects>
						<ns:arrayOfStrings>
							<rdf:Seq>
								<rdf:li>one</rdf:li>
								<rdf:li>two</rdf:li>
								<rdf:li>three</rdf:li>
							</rdf:Seq>
						</ns:arrayOfStrings>
						<ns:arrayWithSingleItem>
							<rdf:Seq>
								<rdf:li>42</rdf:li>
							</rdf:Seq>
						</ns:arrayWithSingleItem>
						<ns:arrayOfMixedPrimitives>
							<rdf:Seq>
								<rdf:li>one</rdf:li>
								<rdf:li>31</rdf:li>
								<rdf:li>true</rdf:li>
								<rdf:li>0.98</rdf:li>
							</rdf:Seq>
						</ns:arrayOfMixedPrimitives>
					</rdf:Description>
				`)
				let serialized = tag.serialize()
				// attrs
				assert.strictEqual(serialized.attrString, 'the attr string')
				assert.strictEqual(serialized.attrFloat, 0.04)
				assert.strictEqual(serialized.attrInteger, 42)
				assert.strictEqual(serialized.attrBoolTrue, true)
				assert.strictEqual(serialized.attrBoolFalse, false)
				// primitive tags
				assert.strictEqual(serialized.tagString, 'the tag string')
				assert.strictEqual(serialized.tagFloat, 0.04)
				assert.strictEqual(serialized.tagInteger, 42)
				assert.strictEqual(serialized.tagBoolTrue, true)
				assert.strictEqual(serialized.tagBoolFalse, false)
				// array of objects
				assert.lengthOf(serialized.arrayOfObjects, 3)
				assert.hasAllKeys(serialized.arrayOfObjects[0], ['objString', 'objInteger'])
				assert.hasAllKeys(serialized.arrayOfObjects[1], ['objFloat', 'objBool'])
				assert.hasAllKeys(serialized.arrayOfObjects[2], ['objString', 'objBool'])
				// simple arrays
				assert.deepEqual(serialized.arrayOfStrings, ['one', 'two', 'three'])
				assert.deepEqual(serialized.arrayWithSingleItem, 42)
				assert.deepEqual(serialized.arrayOfMixedPrimitives, ['one', 31, true, 0.98])
			})

			it('attrs + primitive tags + object tags + array of objects 2', () => {
				let [tag] = XmlTag.findAll(`
					<rdf:Description
					ns:string="the attr string"
					ns:bool="true"
					ns:anotherBool="false"
					ns:integer="42"
					ns:float="0.04">
						<ns:tagValue>the tag string</ns:tagValue>
						<ns:tagObject stRef:instanceID="0deb8273465e" stRef:documentID="34ee041e7e1a"/>
						<ns:tagListWithOneItem>
							<rdf:Seq>
								<rdf:li>LWIR</rdf:li>
							</rdf:Seq>
						</ns:tagListWithOneItem>
						<ns:tagListWithTwoItems>
							<rdf:Seq>
								<rdf:li>one</rdf:li>
								<rdf:li>two</rdf:li>
							</rdf:Seq>
						</ns:tagListWithTwoItems>
						<ns:arrayOfObjects>
							<rdf:Seq>
								<rdf:li
									stEvt:action="derived"
									stEvt:parameters="saved to new location">
								</rdf:li>
								<rdf:li
									stEvt:action="saved"
									stEvt:instanceID="xmp.iid:667349ef-da53-a042-9298-943e9954eba8"
									stEvt:when="2017-05-07T17:32:06+02:00"
									stEvt:softwareAgent="Adobe Photoshop Lightroom 6.9 (Windows)"
									stEvt:changed="/">
								</rdf:li>
							</rdf:Seq>
						</ns:arrayOfObjects>
					</rdf:Description>
				`)
                let serialized = tag.serialize()

				assert.strictEqual(serialized.string, 'the attr string')
				assert.strictEqual(serialized.bool, true)
				assert.strictEqual(serialized.anotherBool, false)
				assert.strictEqual(serialized.integer, 42)
				assert.strictEqual(serialized.float, 0.04)

				assert.strictEqual(serialized.tagValue, 'the tag string')
				assert.strictEqual(serialized.tagListWithOneItem, 'LWIR')

				assert.isObject(serialized.tagObject)
				assert.strictEqual(serialized.tagObject.instanceID, '0deb8273465e')
				assert.strictEqual(serialized.tagObject.documentID, '34ee041e7e1a')

				assert.isArray(serialized.tagListWithTwoItems)
				assert.strictEqual(serialized.tagListWithTwoItems[0], 'one')
				assert.strictEqual(serialized.tagListWithTwoItems[1], 'two')

				assert.isArray(serialized.arrayOfObjects)
				assert.lengthOf(serialized.arrayOfObjects, 2)
				assert.isObject(serialized.arrayOfObjects[0])
				assert.isObject(serialized.arrayOfObjects[1])
				assert.strictEqual(serialized.arrayOfObjects[0].action, 'derived')
				assert.strictEqual(serialized.arrayOfObjects[1].action, 'saved')
			})

			it('case 1 wrapped', () => {
				let [tag] = XmlTag.findAll(`<rdf:Description>
					<FLIR:BandName><rdf:Seq>\t<rdf:li>LWIR</rdf:li>\t</rdf:Seq>\t</FLIR:BandName>
				</rdf:Description>`)
                let serialized = tag.serialize()
				assert.equal(serialized.BandName, 'LWIR')
			})

			it('case 1 raw', () => {
				let [tag] = XmlTag.findAll(`<FLIR:BandName><rdf:Seq>\t<rdf:li>LWIR</rdf:li>\t</rdf:Seq>\t</FLIR:BandName>`)
                let serialized = tag.serialize()
				assert.equal(serialized, 'LWIR')
			})

			it('case 2 wrapped', () => {
				let [tag] = XmlTag.findAll(`<rdf:Description>
					<FLIR:BandName><rdf:Seq>\t<rdf:li>LWIR</rdf:li>\t<rdf:li>LWIR</rdf:li>\t</rdf:Seq>\t</FLIR:BandName>
				</rdf:Description>`)
                let serialized = tag.serialize()
				assert.isArray(serialized.BandName)
				assert.deepEqual(serialized.BandName, ['LWIR', 'LWIR'])
			})

			it('case 2 raw', () => {
				let [tag] = XmlTag.findAll(`<FLIR:BandName><rdf:Seq>\t<rdf:li>LWIR</rdf:li>\t<rdf:li>LWIR</rdf:li>\t</rdf:Seq>\t</FLIR:BandName>`)
                let serialized = tag.serialize()
				assert.isArray(serialized)
				assert.deepEqual(serialized, ['LWIR', 'LWIR'])
			})

			it('case 3 wrapped', () => {
				let [tag] = XmlTag.findAll(`<rdf:Description>
					<crs:ToneCurve>
						<rdf:Seq>
							<rdf:li>0, 0</rdf:li>
							<rdf:li>255, 255</rdf:li>
						</rdf:Seq>
					</crs:ToneCurve>
				</rdf:Description>`)
                let serialized = tag.serialize()
				assert.isArray(serialized.ToneCurve)
				assert.deepEqual(serialized.ToneCurve, ['0, 0', '255, 255'])
			})

			it('case 3 raw', () => {
				let [tag] = XmlTag.findAll(`
					<crs:ToneCurve>
						<rdf:Seq>
							<rdf:li>0, 0</rdf:li>
							<rdf:li>255, 255</rdf:li>
						</rdf:Seq>
					</crs:ToneCurve>
				`)
                let serialized = tag.serialize()
				assert.isArray(serialized)
				assert.deepEqual(serialized, ['0, 0', '255, 255'])
			})

			it('case 4 wrapped', () => {
				let [tag] = XmlTag.findAll(`<rdf:Description>
					<ns:onlyChildren>children string</ns:onlyChildren>
				</rdf:Description>`)
                let serialized = tag.serialize()
				assert.equal(serialized.onlyChildren, 'children string')
			})

			it('case 4 raw', () => {
				let [tag] = XmlTag.findAll(`
					<ns:onlyChildren>children string</ns:onlyChildren>
				`)
                let serialized = tag.serialize()
				assert.equal(serialized, 'children string')
			})

			it('> symbol in attribute', () => {
				let [tag] = XmlTag.findAll(`
					<ns:simple ns:name="less > than">children string</ns:simple>
				`)
                let serialized = tag.serialize()
				assert.equal(serialized.name, 'less > than')
				assert.equal(serialized[VALUE_PROP], 'children string')
			})

			it('> in attribute, space before tag end', () => {
				let [tag] = XmlTag.findAll(`
					<ns:spaceBeforeTagEnd ns:name="less > than" >children string</ns:spaceBeforeTagEnd>
				`)
                let serialized = tag.serialize()
				assert.equal(serialized.name, 'less > than')
				assert.equal(serialized[VALUE_PROP], 'children string')
			})

			it('> in attribute, new line before tag end', () => {
				let [tag] = XmlTag.findAll(`
					<ns:nlBeforeTagEnd
					ns:name="less > than"
					>children string</ns:nlBeforeTagEnd>
				`)
                let serialized = tag.serialize()
				assert.equal(serialized.name, 'less > than')
				assert.equal(serialized[VALUE_PROP], 'children string')
			})

			it('> in attribute, new after tag start', () => {
				let [tag] = XmlTag.findAll(`
					<ns:nlAfterTagStart
					ns:name="less > than">children string</ns:nlAfterTagStart>
				`)
                let serialized = tag.serialize()
				assert.equal(serialized.name, 'less > than')
				assert.equal(serialized[VALUE_PROP], 'children string')
			})

			it('self closing tag-object with one attribute with > inside', () => {
				let [tag] = XmlTag.findAll(`
					<ns:object ns:name="less > than"/>
				`)
                let serialized = tag.serialize()
				assert.equal(serialized.name, 'less > than')
			})

		})


	})



	describe('Xmp.parse', () => {

		describe('basic', () => {

			it('tag primitives', () => {
				let {ns} = Xmp.parse(`<rdf:Description>
					<ns:tagBoolTrue>true</ns:tagBoolTrue>
					<ns:tagBoolFalse>false</ns:tagBoolFalse>
					<ns:tagInteger>42</ns:tagInteger>
					<ns:tagFloat>0.04</ns:tagFloat>
					<ns:tagString>the tag string</ns:tagString>
				</rdf:Description>`)
				assert.strictEqual(ns.tagBoolTrue, true)
				assert.strictEqual(ns.tagBoolFalse, false)
				assert.strictEqual(ns.tagInteger, 42)
				assert.strictEqual(ns.tagFloat, 0.04)
				assert.strictEqual(ns.tagString, 'the tag string')
			})

			it('attr primitives', () => {
				let ns
				ns = Xmp.parse(`<rdf:Description ns:attrString="the attr string"/>`).ns
				assert.strictEqual(ns.attrString, 'the attr string')
				ns = Xmp.parse(`<rdf:Description ns:attrFloat="0.04"/>`).ns
				assert.strictEqual(ns.attrFloat, 0.04)
				ns = Xmp.parse(`<rdf:Description ns:attrInteger="42"/>`).ns
				assert.strictEqual(ns.attrInteger, 42)
				ns = Xmp.parse(`<rdf:Description ns:attrBoolTrue="true"/>`).ns
				assert.strictEqual(ns.attrBoolTrue, true)
				ns = Xmp.parse(`<rdf:Description ns:attrBoolFalse="false"/>`).ns
				assert.strictEqual(ns.attrBoolFalse, false)
			})

			it('array of strings contains strings', () => {
				let {ns} = Xmp.parse(`
					<rdf:Description>
						<ns:arrayOfPrimitives>
							<rdf:Seq>
								<rdf:li>one</rdf:li>
								<rdf:li>two</rdf:li>
								<rdf:li>three</rdf:li>
							</rdf:Seq>
						</ns:arrayOfPrimitives>
					</rdf:Description>
				`)
				assert.isString(ns.arrayOfPrimitives[0])
				assert.isString(ns.arrayOfPrimitives[1])
				assert.isString(ns.arrayOfPrimitives[2])
			})

			it('array of mixed primitive values contains mixed types', () => {
				let {ns} = Xmp.parse(`
					<rdf:Description>
						<ns:arrayOfPrimitives>
							<rdf:Seq>
								<rdf:li>one</rdf:li>
								<rdf:li>31</rdf:li>
								<rdf:li>true</rdf:li>
								<rdf:li>0.98</rdf:li>
							</rdf:Seq>
						</ns:arrayOfPrimitives>
					</rdf:Description>
				`)
				assert.isString(ns.arrayOfPrimitives[0])
				assert.isNumber(ns.arrayOfPrimitives[1])
				assert.isBoolean(ns.arrayOfPrimitives[2])
				assert.isNumber(ns.arrayOfPrimitives[3])
			})

			it('object tag is property in root (pair tags)', () => {
				let {ns} = Xmp.parse(`
					<rdf:Description>
						<ns:theObject ns:action="saved" ns:instanceID="943e9954eba8"/>
					</rdf:Description>
				`)
				assert.hasAllKeys(ns, ['theObject'])
				assert.isObject(ns.theObject);
			})

			it('two object tags are properties in root', () => {
				let {ns} = Xmp.parse(`
					<rdf:Description>
						<ns:firstObject ns:action="derived" ns:parameters="saved to new location" />
						<ns:secondObject
							ns:action="saved"
							ns:instanceID="xmp.iid:667349ef-da53-a042-9298-943e9954eba8"
							ns:when="2017-05-07T17:32:06+02:00"
							ns:softwareAgent="Adobe Photoshop Lightroom 6.9 (Windows)"
							ns:changed="/">
						</ns:secondObject>
					</rdf:Description>
				`)
				assert.hasAllKeys(ns, ['firstObject', 'secondObject'])
				assert.isObject(ns.firstObject);
				assert.isObject(ns.secondObject);
				assert.hasAllKeys(ns.firstObject, ['action', 'parameters'])
				assert.hasAllKeys(ns.secondObject, ['action', 'instanceID', 'when', 'softwareAgent', 'changed'])
			})

			it('various tag children', () => {
				const code = `
					<rdf:Description rdf:about=""
					xmlns:dc="http://purl.org/dc/elements/1.1/">
						<dc:format>application/pdf</dc:format>
						<dc:title>
							<rdf:Alt>
								<rdf:li xml:lang="x-default">XMP Specification Part 3: Storage in Files</rdf:li>
							</rdf:Alt>
						</dc:title>
						<dc:creator>
							<rdf:Seq>
								<rdf:li>Adobe Developer Technologies</rdf:li>
							</rdf:Seq>
						</dc:creator>
					</rdf:Description>
				`
				let output = Xmp.parse(code)
				assert.containsAllKeys(output, ['xmlns', 'dc'])
				assert.equal(output.xmlns.dc, 'http://purl.org/dc/elements/1.1/')
				assert.containsAllKeys(output.dc, ['format', 'title', 'creator'])
				assert.equal(output.dc.format, 'application/pdf')
				assert.deepEqual(output.dc.title, {lang: 'x-default', value: 'XMP Specification Part 3: Storage in Files'})
				assert.equal(output.dc.creator, 'Adobe Developer Technologies')
			})

			it('simple tag children', () => {
				const code = `
					<rdf:Description rdf:about=""
					xmlns:xapMM="http://ns.adobe.com/xap/1.0/mm/">
						<xapMM:DocumentID>uuid:a2a0d182-7b1c-4801-a22c-d610115116bd</xapMM:DocumentID>
						<xapMM:InstanceID>uuid:1a365cee-e070-4b52-8278-db5e46b20a4c</xapMM:InstanceID>
					</rdf:Description>
				`
				let output = Xmp.parse(code)
				assert.containsAllKeys(output, ['xmlns', 'xapMM'])
				assert.equal(output.xmlns.xapMM, 'http://ns.adobe.com/xap/1.0/mm/')
				assert.containsAllKeys(output.xapMM, ['DocumentID', 'InstanceID'])
				assert.equal(output.xapMM.DocumentID, 'uuid:a2a0d182-7b1c-4801-a22c-d610115116bd')
				assert.equal(output.xapMM.InstanceID, 'uuid:1a365cee-e070-4b52-8278-db5e46b20a4c')
			})

			it('overlapping properties of different namespaces are stored in separate namespace', () => {
				const code = `
					<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.1.0-jc003">
						<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
							<rdf:Description rdf:about=""
							xmlns:GImage="http://ns.google.com/photos/1.0/image/"
							xmlns:GAudio="http://ns.google.com/photos/1.0/audio/"
							GImage:Data="/9j/4AAQ"
							GAudio:Data="AAAAGGZ0"/>
						</rdf:RDF>
					</x:xmpmeta>
				`
				let output = Xmp.parse(code)
				assert.equal(output.GImage.Data, '/9j/4AAQ')
				assert.equal(output.GAudio.Data, 'AAAAGGZ0')
			})

		})

		describe('basic, unwrapped or invalid xmp input', () => {

			it('empty string returns undefined', () => {
				let output = Xmp.parse(``)
				assert.isUndefined(output)
			})

			it('raw tag object (with no wrapper) correctly parses', () => {
				let {ns} = Xmp.parse(`
					<ns:theObject
						tiff:Make="Canon"
						tiff:Model="Canon EOS 550D"
					/>
				`)
				assert.isObject(ns)
				assert.hasAllKeys(ns, ['theObject'])
				assert.isObject(ns.theObject)
				assert.hasAllKeys(ns.theObject, ['Make', 'Model'])
				assert.equal(ns.theObject.Make, 'Canon')
				assert.equal(ns.theObject.Model, 'Canon EOS 550D')
			})

			it('raw primitive tags (with no wrapper) correctly parses', () => {
				let {tiff} = Xmp.parse(`
					<tiff:Make>Canon</tiff:Make>
					<tiff:Model>Canon EOS 550D</tiff:Model>
				`)
				assert.isObject(tiff)
				assert.hasAllKeys(tiff, ['Make', 'Model'])
				assert.equal(tiff.Make, 'Canon')
				assert.equal(tiff.Model, 'Canon EOS 550D')
			})

		})

		describe('encapsulation is stripped down to content of rdf:Description', () => {

			it('rdf:Description > data object', () => {
				let output = Xmp.parse(`
					<rdf:Description rdf:about='' xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>
						<tiff:Make>Canon</tiff:Make>
						<tiff:Model>Canon EOS 550D</tiff:Model>
					</rdf:Description>
				`)
				assert.hasAllKeys(output, ['tiff', 'xmlns'])
				assert.hasAllKeys(output.tiff, ['Make', 'Model'])
				assert.equal(output.tiff.Make, 'Canon')
				assert.equal(output.tiff.Model, 'Canon EOS 550D')
			})

			it('rdf:RDF > rdf:Description > data object', () => {
				let output = Xmp.parse(`
					<rdf:RDF>
						<rdf:Description rdf:about='' xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>
							<tiff:Make>Canon</tiff:Make>
							<tiff:Model>Canon EOS 550D</tiff:Model>
						</rdf:Description>
					</rdf:RDF>
				`)
				assert.hasAllKeys(output, ['tiff', 'xmlns'])
				assert.hasAllKeys(output.tiff, ['Make', 'Model'])
				assert.equal(output.tiff.Make, 'Canon')
				assert.equal(output.tiff.Model, 'Canon EOS 550D')
			})

			it('x:xmpmeta > rdf:RDF > rdf:Description > data object', () => {
				let output = Xmp.parse(`
					<x:xmpmeta>
						<rdf:RDF>
							<rdf:Description rdf:about='' xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>
								<tiff:Make>Canon</tiff:Make>
								<tiff:Model>Canon EOS 550D</tiff:Model>
							</rdf:Description>
						</rdf:RDF>
					</x:xmpmeta>
				`)
				assert.hasAllKeys(output, ['tiff', 'xmlns'])
				assert.hasAllKeys(output.tiff, ['Make', 'Model'])
				assert.equal(output.tiff.Make, 'Canon')
				assert.equal(output.tiff.Model, 'Canon EOS 550D')
			})

			it('?xpacket > rdf:RDF > rdf:Description > data object', () => {
				let output = Xmp.parse(`
					<?xpacket>
						<rdf:RDF>
							<rdf:Description rdf:about='' xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>
								<tiff:Make>Canon</tiff:Make>
								<tiff:Model>Canon EOS 550D</tiff:Model>
							</rdf:Description>
						</rdf:RDF>
					</?xpacket>
				`)
				assert.hasAllKeys(output, ['tiff', 'xmlns'])
				assert.hasAllKeys(output.tiff, ['Make', 'Model'])
				assert.equal(output.tiff.Make, 'Canon')
				assert.equal(output.tiff.Model, 'Canon EOS 550D')
			})

			it('?xpacket > x:xmpmeta > rdf:RDF > rdf:Description > data object', () => {
				let output = Xmp.parse(`
					<?xpacket>
						<x:xmpmeta>
							<rdf:RDF>
								<rdf:Description rdf:about='' xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>
									<tiff:Make>Canon</tiff:Make>
									<tiff:Model>Canon EOS 550D</tiff:Model>
								</rdf:Description>
							</rdf:RDF>
						</x:xmpmeta>
					</?xpacket>
				`)
				assert.hasAllKeys(output, ['tiff', 'xmlns'])
				assert.hasAllKeys(output.tiff, ['Make', 'Model'])
				assert.equal(output.tiff.Make, 'Canon')
				assert.equal(output.tiff.Model, 'Canon EOS 550D')
			})

		})

		describe('rdf:Description without data returns undefined', () => {

			it('empty self-closing rdf:Description returns undefined', () => {
				let output = Xmp.parse(`<rdf:Description/>`)
				assert.isUndefined(output)
			})

			it('empty pair rdf:Description returns undefined', () => {
				let output = Xmp.parse(`<rdf:Description></rdf:Description>`)
				assert.isUndefined(output)
			})

			it('empty pair rdf:Description with children spaces returns undefined', () => {
				let output = Xmp.parse(`<rdf:Description>   </rdf:Description>`)
				assert.isUndefined(output)
			})

		})

		describe('rdf:Description with data returns object', () => {

			it('self-closing rdf:Description with single attr', () => {
				let {ns} = Xmp.parse(`
					<rdf:Description ns:attrString="the attr string"/>
				`)
				assert.isObject(ns)
				assert.strictEqual(ns.attrString, 'the attr string')
			})

			it('pair rdf:Description with single attr', () => {
				let {ns} = Xmp.parse(`
					<rdf:Description ns:attrString="the attr string"></rdf:Description>
				`)
				assert.strictEqual(ns.attrString, 'the attr string')
			})

			it('pair rdf:Description with newline children with single attr', () => {
				let {ns} = Xmp.parse(`
					<rdf:Description ns:attrString="the attr string">
					</rdf:Description>
				`)
				assert.strictEqual(ns.attrString, 'the attr string')
			})

			it('pair rdf:Description with single tag', () => {
				let {ns} = Xmp.parse(`
					<rdf:Description>
						<ns:tagString>the tag string</ns:tagString>
					</rdf:Description>
				`)
				assert.strictEqual(ns.tagString, 'the tag string')
			})

			it('tag & attr strings', () => {
				let {ns} = Xmp.parse(`
					<rdf:Description ns:attrString="the attr string">
						<ns:tagString>the tag string</ns:tagString>
					</rdf:Description>
				`)
				assert.strictEqual(ns.attrString, 'the attr string')
				assert.strictEqual(ns.tagString, 'the tag string')
			})

		})

		describe('multiple rdf:Description', () => {

			const code = `
				<rdf:RDF>
					<rdf:Description rdf:about='' xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>
						<tiff:Make>Canon</tiff:Make>
						<tiff:Model>Canon EOS 20D</tiff:Model>
					</rdf:Description>
					<rdf:Description rdf:about='' xmlns:aux='http://ns.adobe.com/exif/1.0/aux/'>
						<aux:Lens>17.0-85.0 mm</aux:Lens>
						<aux:LensInfo>17/1 85/1 0/0 0/0</aux:LensInfo>
					</rdf:Description>
					<rdf:Description rdf:about='' xmlns:crs='http://ns.adobe.com/camera-raw-settings/1.0/'>
						<crs:AlreadyApplied>true</crs:AlreadyApplied>
						<crs:BlueSaturation>0</crs:BlueSaturation>
					</rdf:Description>
				</rdf:RDF>
			`

			it('all tags are parsed and grouped by namespace when {mergeOutput: false}', () => {
				let output = Xmp.parse(code)
				// containsAllKeys is not strict. output has to contain these, but there can be more
				assert.containsAllKeys(output, ['tiff', 'aux', 'crs'])
				assert.equal(output.tiff.Make, 'Canon')
				assert.equal(output.tiff.Model, 'Canon EOS 20D')
				assert.equal(output.aux.Lens, '17.0-85.0 mm')
				assert.equal(output.aux.LensInfo, '17/1 85/1 0/0 0/0')
				assert.equal(output.crs.AlreadyApplied, true)
				assert.equal(output.crs.BlueSaturation, 0)
			})

			it('xmlns meta tags are stored in output.xmlns when {mergeOutput: false}', () => {
				let output = Xmp.parse(code)
				// containsAllKeys is not strict. output has to contain these, but there can be more
				assert.isObject(output.xmlns)
				assert.isString(output.xmlns.tiff)
				assert.isString(output.xmlns.aux)
				assert.isString(output.xmlns.crs)
			})

		})

		describe('empty objects are left undefined', () => {

			it('the output is undefined if all namespaces are empty or undefined (grouped)', async () => {
				let code = `<rdf:Description rdf:about=""/>`
				let output = Xmp.parse(code)
				assert.isUndefined(output)
			})

			it('the output is undefined if all namespaces are empty or undefined (merged)', async () => {
				let code = `<rdf:Description rdf:about=""/>`
				let output = Xmp.parse(code)
				assert.isUndefined(output)
			})

			it('empty or undefined segments are not included in the output instead of being undefined (merged)', async () => {
				let code = `<rdf:Description rdf:about="" foo:bar="baz"/>`
				let output = Xmp.parse(code)
				assert.hasAllKeys(output, ['foo'])
			})

		})

	})



	// syntax that used to be problematic
	describe('nested lists of xmp-gcam-portrait.xml', () => {

		it('assigns id to each list or list item', () => {
			let input    = `<rdf:Seq><rdf:li><rdf:Seq><rdf:li>FooBar</rdf:li></rdf:Seq></rdf:li></rdf:Seq>`
			let expected = `<rdf:Seq#1><rdf:li#1><rdf:Seq#2><rdf:li#2>FooBar</rdf:li#2></rdf:Seq#2></rdf:li#1></rdf:Seq#1>`
			let output = idNestedTags(input)
			assert.equal(output, expected)
		})

		describe('extraction', () => {

			it('core object', () => {
				let [CameraIndices] = XmlTag.findAll(idNestedTags(`
					<Profile:CameraIndices>
						<rdf:Seq>
							<rdf:li>0</rdf:li>
						</rdf:Seq>
					</Profile:CameraIndices>
				`))
				assert.equal(CameraIndices.ns, 'Profile')
				assert.equal(CameraIndices.name, 'CameraIndices')
				assert.lengthOf(CameraIndices.children, 1)
				let [Seq] = CameraIndices.children
				assert.equal(Seq.ns, 'rdf')
				assert.equal(Seq.name, 'Seq')
				assert.lengthOf(Seq.children, 1)
				let [li] = Seq.children
				assert.equal(li.ns, 'rdf')
				assert.equal(li.name, 'li')
				assert.equal(li.value, 0)
				assert.lengthOf(li.children, 0)
			})

			it('parent object', () => {
				let [Profile] = XmlTag.findAll(idNestedTags(`
					<Device:Profile Profile:Type="DepthPhoto">
						<Profile:CameraIndices>
							<rdf:Seq>
								<rdf:li>0</rdf:li>
							</rdf:Seq>
						</Profile:CameraIndices>
					</Device:Profile>
				`))
				assert.equal(Profile.ns, 'Device')
				assert.equal(Profile.name, 'Profile')
				assert.lengthOf(Profile.attrs, 1)
				assert.lengthOf(Profile.children, 1)
				let [CameraIndices] = Profile.children
				assert.equal(CameraIndices.ns, 'Profile')
				assert.equal(CameraIndices.name, 'CameraIndices')
				assert.lengthOf(CameraIndices.children, 1)
				let [Seq] = CameraIndices.children
				assert.equal(Seq.ns, 'rdf')
				assert.equal(Seq.name, 'Seq')
				assert.lengthOf(Seq.children, 1)
				let [li] = Seq.children
				assert.equal(li.ns, 'rdf')
				assert.equal(li.name, 'li')
				assert.equal(li.value, 0)
				assert.lengthOf(li.children, 0)
			})

			it('parent list item', () => {
				let [parentLi] = XmlTag.findAll(idNestedTags(`
					<rdf:li>
						<Device:Profile Profile:Type="DepthPhoto">
							<Profile:CameraIndices>
								<rdf:Seq>
									<rdf:li>0</rdf:li>
								</rdf:Seq>
							</Profile:CameraIndices>
						</Device:Profile>
					</rdf:li>
				`))
				assert.equal(parentLi.ns, 'rdf')
				assert.equal(parentLi.name, 'li')
				assert.lengthOf(parentLi.children, 1)
				let [Profile] = parentLi.children
				assert.equal(Profile.ns, 'Device')
				assert.equal(Profile.name, 'Profile')
				assert.lengthOf(Profile.attrs, 1)
				assert.lengthOf(Profile.children, 1)
				let [CameraIndices] = Profile.children
				assert.equal(CameraIndices.ns, 'Profile')
				assert.equal(CameraIndices.name, 'CameraIndices')
				assert.lengthOf(CameraIndices.children, 1)
				let [Seq] = CameraIndices.children
				assert.equal(Seq.ns, 'rdf')
				assert.equal(Seq.name, 'Seq')
				assert.lengthOf(Seq.children, 1)
				let [li] = Seq.children
				assert.equal(li.ns, 'rdf')
				assert.equal(li.name, 'li')
				assert.equal(li.value, 0)
				assert.lengthOf(li.children, 0)
			})

			it('parent list (Seq)', () => {
				let [parentSeq] = XmlTag.findAll(idNestedTags(`
					<rdf:Seq>
						<rdf:li>
							<Device:Profile Profile:Type="DepthPhoto">
								<Profile:CameraIndices>
									<rdf:Seq>
										<rdf:li>0</rdf:li>
									</rdf:Seq>
								</Profile:CameraIndices>
							</Device:Profile>
						</rdf:li>
					</rdf:Seq>
				`))
				assert.equal(parentSeq.ns, 'rdf')
				assert.equal(parentSeq.name, 'Seq')
				assert.lengthOf(parentSeq.children, 1)
				let [parentLi] = parentSeq.children
				assert.equal(parentLi.ns, 'rdf')
				assert.equal(parentLi.name, 'li')
				assert.lengthOf(parentLi.children, 1)
				let [Profile] = parentLi.children
				assert.equal(Profile.ns, 'Device')
				assert.equal(Profile.name, 'Profile')
				assert.lengthOf(Profile.attrs, 1)
				assert.lengthOf(Profile.children, 1)
				let [CameraIndices] = Profile.children
				assert.equal(CameraIndices.ns, 'Profile')
				assert.equal(CameraIndices.name, 'CameraIndices')
				assert.lengthOf(CameraIndices.children, 1)
				let [Seq] = CameraIndices.children
				assert.equal(Seq.ns, 'rdf')
				assert.equal(Seq.name, 'Seq')
				assert.lengthOf(Seq.children, 1)
				let [li] = Seq.children
				assert.equal(li.ns, 'rdf')
				assert.equal(li.name, 'li')
				assert.equal(li.value, 0)
				assert.lengthOf(li.children, 0)
			})

		})

		describe('serialization', () => {

			it('core object', () => {
				let [tag] = XmlTag.findAll(idNestedTags(`
					<Profile:CameraIndices>
						<rdf:Seq>
							<rdf:li>0</rdf:li>
						</rdf:Seq>
					</Profile:CameraIndices>
				`))
				let CameraIndices = tag.serialize()
				assert.equal(CameraIndices, 0)
			})

			it('parent object', () => {
				let [tag] = XmlTag.findAll(idNestedTags(`
					<Device:Profile Profile:Type="DepthPhoto">
						<Profile:CameraIndices>
							<rdf:Seq>
								<rdf:li>0</rdf:li>
							</rdf:Seq>
						</Profile:CameraIndices>
					</Device:Profile>
				`))
				let Device = tag.serialize()
				assert.equal(Device.Type, 'DepthPhoto')
				assert.equal(Device.CameraIndices, 0)
			})

			it('parent list item', () => {
				let [tag] = XmlTag.findAll(idNestedTags(`
					<rdf:li>
						<Device:Profile Profile:Type="DepthPhoto">
							<Profile:CameraIndices>
								<rdf:Seq>
									<rdf:li>0</rdf:li>
								</rdf:Seq>
							</Profile:CameraIndices>
						</Device:Profile>
					</rdf:li>
				`))
				let li = tag.serialize()
				assert.equal(li.Type, 'DepthPhoto')
				assert.equal(li.CameraIndices, 0)
			})

			it('parent list (Seq)', () => {
				let [tag] = XmlTag.findAll(idNestedTags(`
					<rdf:Seq>
						<rdf:li>
							<Device:Profile Profile:Type="DepthPhoto">
								<Profile:CameraIndices>
									<rdf:Seq>
										<rdf:li>0</rdf:li>
									</rdf:Seq>
								</Profile:CameraIndices>
							</Device:Profile>
						</rdf:li>
					</rdf:Seq>
				`))
				let seq = tag.serialize()
				assert.equal(seq.Type, 'DepthPhoto')
				assert.equal(seq.CameraIndices, 0)
			})

		})

		describe('parsing', () => {

			it('nested list parse', () => {
				let {Device} = Xmp.parse(`
					<Device:Profiles>
						<rdf:Seq>
							<rdf:li>
								<Device:Profile Profile:Type="DepthPhoto">
									<Profile:CameraIndices>
										<rdf:Seq>
											<rdf:li>0</rdf:li>
										</rdf:Seq>
									</Profile:CameraIndices>
								</Device:Profile>
							</rdf:li>
						</rdf:Seq>
					</Device:Profiles>
				`)
				assert.isObject(Device.Profiles)
				assert.equal(Device.Profiles.Type, 'DepthPhoto')
				assert.equal(Device.Profiles.CameraIndices, 0)
			})

		})

	})


})