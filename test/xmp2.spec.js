import {assert} from './test-util-core.js'
import {XmpParser, normalizeValue, matchTags, matchAttributes} from '../src/segment-parsers/xmp2.js'


const CHILDREN_PROP = 'children'

describe('XmlParser', () => {

	describe('enscapsulation', () => {

		it('empty string returns undefined', () => {
			let output = XmpParser.parse(``)
			assert.isUndefined(output)
		})

		it('plain data object', () => {
			let output = XmpParser.parse(`
				<ns:theObject
					tiff:Make="Canon"
					tiff:Model="Canon EOS 550D"
				/>
			`)
			assert.isObject(output)
			assert.hasAllKeys(output, ['theObject'])
			assert.isObject(output.theObject)
			assert.hasAllKeys(output.theObject, ['Make', 'Model'])
			assert.equal(output.theObject.Make, 'Canon')
			assert.equal(output.theObject.Model, 'Canon EOS 550D')
		})

		it('rdf:Description > data object', () => {
			let output = XmpParser.parse(`
				<rdf:Description rdf:about='' xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>
					<tiff:Make>Canon</tiff:Make>
					<tiff:Model>Canon EOS 550D</tiff:Model>
				</rdf:Description>
			`)
			assert.hasAllKeys(output, ['about', 'tiff', 'Make', 'Model'])
			assert.equal(output.Make, 'Canon')
			assert.equal(output.Model, 'Canon EOS 550D')
		})

		it('rdf:RDF > rdf:Description > data object', () => {
			let output = XmpParser.parse(`
				<rdf:RDF>
					<rdf:Description rdf:about='' xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>
						<tiff:Make>Canon</tiff:Make>
						<tiff:Model>Canon EOS 550D</tiff:Model>
					</rdf:Description>
				</rdf:RDF>
			`)
			assert.hasAllKeys(output, ['about', 'tiff', 'Make', 'Model'])
			assert.equal(output.Make, 'Canon')
			assert.equal(output.Model, 'Canon EOS 550D')
		})

		it('x:xmpmeta > rdf:RDF > rdf:Description > data object', () => {
			let output = XmpParser.parse(`
				<x:xmpmeta>
					<rdf:RDF>
						<rdf:Description rdf:about='' xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>
							<tiff:Make>Canon</tiff:Make>
							<tiff:Model>Canon EOS 550D</tiff:Model>
						</rdf:Description>
					</rdf:RDF>
				</x:xmpmeta>
			`)
			assert.hasAllKeys(output, ['about', 'tiff', 'Make', 'Model'])
			assert.equal(output.Make, 'Canon')
			assert.equal(output.Model, 'Canon EOS 550D')
		})

		it('?xpacket > rdf:RDF > rdf:Description > data object', () => {
			let output = XmpParser.parse(`
				<?xpacket>
					<rdf:RDF>
						<rdf:Description rdf:about='' xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>
							<tiff:Make>Canon</tiff:Make>
							<tiff:Model>Canon EOS 550D</tiff:Model>
						</rdf:Description>
					</rdf:RDF>
				</?xpacket>
			`)
			assert.hasAllKeys(output, ['about', 'tiff', 'Make', 'Model'])
			assert.equal(output.Make, 'Canon')
			assert.equal(output.Model, 'Canon EOS 550D')
		})

		it('?xpacket > x:xmpmeta > rdf:RDF > rdf:Description > data object', () => {
			let output = XmpParser.parse(`
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
			assert.hasAllKeys(output, ['about', 'tiff', 'Make', 'Model'])
			assert.equal(output.Make, 'Canon')
			assert.equal(output.Model, 'Canon EOS 550D')
		})

	})

	describe('rdf:Description basics', () => {

		it('empty self-closing rdf:Description', () => {
			let output = XmpParser.parse(`
				<rdf:Description/>
			`)
			assert.isEmpty(output)
		})

		it('empty pair rdf:Description', () => {
			let output = XmpParser.parse(`
				<rdf:Description></rdf:Description>
			`)
			assert.isEmpty(output)
		})

		it('empty pair rdf:Description with children spaces', () => {
			let output = XmpParser.parse(`
				<rdf:Description>   </rdf:Description>
			`)
			assert.isEmpty(output)
		})

		it('single attr in self-closing rdf:Description', () => {
			let output = XmpParser.parse(`
				<rdf:Description ns:attrString="the attr string"/>
			`)
			assert.strictEqual(output.attrString, 'the attr string')
		})

		it('single attr in pair rdf:Description', () => {
			let output = XmpParser.parse(`
				<rdf:Description ns:attrString="the attr string"></rdf:Description>
			`)
			assert.strictEqual(output.attrString, 'the attr string')
		})

		it('single attr in pair rdf:Description with newline children', () => {
			let output = XmpParser.parse(`
				<rdf:Description ns:attrString="the attr string">
				</rdf:Description>
			`)
			assert.strictEqual(output.attrString, 'the attr string')
		})

		it('single tag in pair rdf:Description', () => {
			let output = XmpParser.parse(`
				<rdf:Description>
					<ns:tagString>the tag string</ns:tagString>
				</rdf:Description>
			`)
			assert.strictEqual(output.tagString, 'the tag string')
		})

		it('tag & attr strings', () => {
			let output = XmpParser.parse(`
				<rdf:Description ns:attrString="the attr string">
					<ns:tagString>the tag string</ns:tagString>
				</rdf:Description>
			`)
			assert.strictEqual(output.attrString, 'the attr string')
			assert.strictEqual(output.tagString, 'the tag string')
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

		it('all tags are parsed and combined', () => {
			let output = XmpParser.parse(code)
			assert.equal(output.Make, 'Canon')
			assert.equal(output.Model, 'Canon EOS 20D')
			assert.equal(output.Lens, '17.0-85.0 mm')
			assert.equal(output.LensInfo, '17/1 85/1 0/0 0/0')
			assert.equal(output.AlreadyApplied, true)
			assert.equal(output.BlueSaturation, 0)
		})

		it('all tags are parsed and grouped by namespace when {groupByNamespace: true}', () => {
			let options = {groupByNamespace: true}
			let output = XmpParser.parse(code, options)
			// containsAllKeys is not strict. output has to contain these, but there can be more
			assert.containsAllKeys(output, ['tiff', 'aux', 'crs'])
			assert.equal(output.tiff.Make, 'Canon')
			assert.equal(output.tiff.Model, 'Canon EOS 20D')
			assert.equal(output.aux.Lens, '17.0-85.0 mm')
			assert.equal(output.aux.LensInfo, '17/1 85/1 0/0 0/0')
			assert.equal(output.crs.AlreadyApplied, true)
			assert.equal(output.crs.BlueSaturation, 0)
		})

		it('xmlns meta tags are stored in output.xmlns when {groupByNamespace: true}', () => {
			let options = {groupByNamespace: true}
			let output = XmpParser.parse(code, options)
			console.log('output', output)
			// containsAllKeys is not strict. output has to contain these, but there can be more
			assert.isObject(output.xmlns)
			assert.isString(output.xmlns.tiff)
			assert.isString(output.xmlns.aux)
			assert.isString(output.xmlns.crs)
		})

		describe('overlapping properties of different namespaces', () => {

			const code = `
				<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.1.0-jc003">
					<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
						<rdf:Description rdf:about=""
						xmlns:GImage="http://ns.google.com/photos/1.0/image/"
						xmlns:GAudio="http://ns.google.com/photos/1.0/audio/"
						GImage:Data="/9j/4AAQSkZJRgABAQAAAQABAAD..."
						GAudio:Data="AAAAGGZ0eXBtcDQyAAAAAGlzb21..."/>
					</rdf:RDF>
				</x:xmpmeta>
			`

			it('one overrides the other by default', () => {
				let output = XmpParser.parse(code)
				assert.isString(output.Data)
			})

			it('each attr is stored in separate namespace when {groupByNamespace: true}', () => {
				let options = {groupByNamespace: true}
				let output = XmpParser.parse(code, options)
				assert.isString(output.GImage)
				assert.isString(output.GAudio)
			})
		})



	})


	describe('matchAttributes()', () => {

		describe(`=""`, () => {

			it(`finds single attr`, () => {
				assert.lengthOf(matchAttributes(`ns:name="abc"`), 1)
			})

			it(`finds multiple attr`, () => {
				assert.lengthOf(matchAttributes(`ns:name="abc" ns:second="def"`), 2)
			})

			it(`properly parses attribute`, () => {
				let match = matchAttributes(`namespace:name="value"`)[0]
				assert.equal(match.namespace, 'namespace')
				assert.equal(match.name, 'name')
				assert.equal(match.value, 'value')
			})

			it(`properly parses empty string value as undefined`, () => {
				let match = matchAttributes(`namespace:name=""`)[0]
				assert.equal(match.namespace, 'namespace')
				assert.equal(match.name, 'name')
				assert.equal(match.value, undefined)
			})

		})

		describe(`=''`, () => {

			it(`handles =''`, () => {
				assert.lengthOf(matchAttributes(`ns:name='abc'`), 1)
			})

			it(`handles multiple =''`, () => {
				assert.lengthOf(matchAttributes(`ns:name='abc' ns:second='def'`), 2)
			})

			it(`properly parses attribute`, () => {
				let match = matchAttributes(`namespace:name='value'`)[0]
				assert.equal(match.namespace, 'namespace')
				assert.equal(match.name, 'name')
				assert.equal(match.value, 'value')
			})

			it(`properly parses empty string value as undefined`, () => {
				let match = matchAttributes(`namespace:name=''`)[0]
				assert.equal(match.namespace, 'namespace')
				assert.equal(match.name, 'name')
				assert.equal(match.value, undefined)
			})

		})

		describe(`combination of ='' and =""`, () => {

			it(`finds two of ="" and  =''`, () => {
				assert.lengthOf(matchAttributes(`ns:first="abc" ns:second='def'`), 2)
			})

			it(`finds multiple ="" and  =''`, () => {
				assert.lengthOf(matchAttributes(`ns:first="abc" ns:second='true' ns:third="12.45" ns:fourth='123'`), 4)
			})

			it(`properly parses all attributes`, () => {
				let [match1, match2, match3] = matchAttributes(`foo:first="abc" bar:second='def'`)
				assert.equal(match1.namespace, 'foo')
				assert.equal(match1.name, 'first')
				assert.equal(match1.value, 'abc')
				assert.equal(match2.namespace, 'bar')
				assert.equal(match2.name, 'second')
				assert.equal(match2.value, 'def')
			})

		})

	})


	describe('matchTags()', () => {

		it(`?xpacket > rdf:RDF > rdf:Description > data object`, () => {
			let matches = matchTags(`
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
			assert.equal(matches[0].namespace, 'rdf')
			assert.equal(matches[0].name, 'RDF')
		})

		it(`rdf:RDF > rdf:Description > data object`, () => {
			let matches = matchTags(`
				<rdf:RDF>
					<rdf:Description rdf:about='' xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>
						<tiff:Make>Canon</tiff:Make>
						<tiff:Model>Canon EOS 550D</tiff:Model>
					</rdf:Description>
				</rdf:RDF>
			`)
			assert.lengthOf(matches, 1)
			assert.equal(matches[0].namespace, 'rdf')
			assert.equal(matches[0].name, 'RDF')
		})

		it(`rdf:Description (with '') > data object`, () => {
			let matches = matchTags(`
				<rdf:Description xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>
					<tiff:Make>Canon</tiff:Make>
					<tiff:Model>Canon EOS 550D</tiff:Model>
				</rdf:Description>
			`)
			assert.lengthOf(matches, 1)
			assert.equal(matches[0].namespace, 'rdf')
			assert.equal(matches[0].name, 'Description')
		})

		it(`rdf:Description (with "") > data object`, () => {
			let matches = matchTags(`
				<rdf:Description xmlns:tiff="http://ns.adobe.com/tiff/1.0/">
					<tiff:Make>Canon</tiff:Make>
					<tiff:Model>Canon EOS 550D</tiff:Model>
				</rdf:Description>
			`)
			assert.lengthOf(matches, 1)
			assert.equal(matches[0].namespace, 'rdf')
			assert.equal(matches[0].name, 'Description')
		})

		it(`tag with empty string attribute`, () => {
			let matches = matchTags(`
				<rdf:Description rdf:about="">
					<tiff:Make>Canon</tiff:Make>
					<tiff:Model>Canon EOS 550D</tiff:Model>
				</rdf:Description>
			`)
			assert.lengthOf(matches, 1)
			assert.equal(matches[0].namespace, 'rdf')
			assert.equal(matches[0].name, 'Description')
		})

	})


	describe('basic tags & attrs', () => {

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

		})

		describe('tag primitives', () => {

			it('tag string', () => {
				let output = XmpParser.parse(`<rdf:Description>
					<ns:tagString>the tag string</ns:tagString>
				</rdf:Description>`)
				assert.strictEqual(output.tagString, 'the tag string')
			})

			it('tag float', () => {
				let output = XmpParser.parse(`<rdf:Description>
					<ns:tagFloat>0.04</ns:tagFloat>
				</rdf:Description>`)
				assert.strictEqual(output.tagFloat, 0.04)
			})

			it('tag integer', () => {
				let output = XmpParser.parse(`<rdf:Description>
					<ns:tagInteger>42</ns:tagInteger>
				</rdf:Description>`)
				assert.strictEqual(output.tagInteger, 42)
			})

			it('tag bool (true)', () => {
				let output = XmpParser.parse(`<rdf:Description>
					<ns:tagBoolTrue>true</ns:tagBoolTrue>
				</rdf:Description>`)
				assert.strictEqual(output.tagBoolTrue, true)
			})

			it('tag bool (false)', () => {
				let output = XmpParser.parse(`<rdf:Description>
					<ns:tagBoolFalse>false</ns:tagBoolFalse>
				</rdf:Description>`)
				assert.strictEqual(output.tagBoolFalse, false)
			})

		})

		describe('attr primitives', () => {

			it('attr string', () => {
				let output = XmpParser.parse(`<rdf:Description ns:attrString="the attr string"/>`)
				assert.strictEqual(output.attrString, 'the attr string')
			})

			it('attr float', () => {
				let output = XmpParser.parse(`<rdf:Description ns:attrFloat="0.04"/>`)
				assert.strictEqual(output.attrFloat, 0.04)
			})

			it('attr integer', () => {
				let output = XmpParser.parse(`<rdf:Description ns:attrInteger="42"/>`)
				assert.strictEqual(output.attrInteger, 42)
			})

			it('attr bool (true)', () => {
				let output = XmpParser.parse(`<rdf:Description ns:attrBoolTrue="true"/>`)
				assert.strictEqual(output.attrBoolTrue, true)
			})

			it('attr bool (false)', () => {
				let output = XmpParser.parse(`<rdf:Description ns:attrBoolFalse="false"/>`)
				assert.strictEqual(output.attrBoolFalse, false)
			})

		})

	})


	describe('Array tag', () => {

		for (let tag of ['rdf:Seq', 'rdf:Bag', 'rdf:Alt']) {

			describe(tag, () => {

				it(`array tag is becomes single value, if it has only one item`, () => {
					let output = XmpParser.parse(`
						<rdf:Description>
							<ns:tagArray>
								<${tag}>
									<rdf:li>single value</rdf:li>
								</${tag}>
							</ns:tagArray>
						</rdf:Description>
					`)
					assert.equal(output.tagArray, 'single value')
				})

				it(`array tag is Array type, if it has two or more items`, () => {
					let output = XmpParser.parse(`
						<rdf:Description>
							<ns:tagArray>
								<${tag}>
									<rdf:li>one</rdf:li>
									<rdf:li>two</rdf:li>
								</${tag}>
							</ns:tagArray>
						</rdf:Description>
					`)
					assert.isArray(output.tagArray)
				})

			})

		}

		it('array of strings contains strings', () => {
			let output = XmpParser.parse(`
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
			assert.isString(output.arrayOfPrimitives[0])
			assert.isString(output.arrayOfPrimitives[1])
			assert.isString(output.arrayOfPrimitives[2])
		})

		it('array of mixed primitive values contains mixed types', () => {
			let output = XmpParser.parse(`
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
			assert.isString(output.arrayOfPrimitives[0])
			assert.isNumber(output.arrayOfPrimitives[1])
			assert.isBoolean(output.arrayOfPrimitives[2])
			assert.isNumber(output.arrayOfPrimitives[3])
		})

		describe('array contains proper primitives', () => {

			it('strings', () => {
				let output = XmpParser.parse(`
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
				assert.lengthOf(output.arrayOfPrimitives, 3)
				assert.strictEqual(output.arrayOfPrimitives[0], 'one')
				assert.strictEqual(output.arrayOfPrimitives[1], 'two')
				assert.strictEqual(output.arrayOfPrimitives[2], 'three')
			})

			it('bools: false', () => {
				let output = XmpParser.parse(`
					<rdf:Description>
						<ns:arrayOfPrimitives>
							<rdf:Seq>
								<rdf:li>false</rdf:li>
								<rdf:li>false</rdf:li>
								<rdf:li>false</rdf:li>
							</rdf:Seq>
						</ns:arrayOfPrimitives>
					</rdf:Description>
				`)
				assert.lengthOf(output.arrayOfPrimitives, 3)
				assert.strictEqual(output.arrayOfPrimitives[0], false)
				assert.strictEqual(output.arrayOfPrimitives[1], false)
				assert.strictEqual(output.arrayOfPrimitives[2], false)
			})

			it('bools: true', () => {
				let output = XmpParser.parse(`
					<rdf:Description>
						<ns:arrayOfPrimitives>
							<rdf:Seq>
								<rdf:li>true</rdf:li>
								<rdf:li>true</rdf:li>
								<rdf:li>true</rdf:li>
							</rdf:Seq>
						</ns:arrayOfPrimitives>
					</rdf:Description>
				`)
				assert.lengthOf(output.arrayOfPrimitives, 3)
				assert.strictEqual(output.arrayOfPrimitives[0], true)
				assert.strictEqual(output.arrayOfPrimitives[1], true)
				assert.strictEqual(output.arrayOfPrimitives[2], true)
			})

			it('bools: mixed', () => {
				let output = XmpParser.parse(`
					<rdf:Description>
						<ns:arrayOfPrimitives>
							<rdf:Seq>
								<rdf:li>true</rdf:li>
								<rdf:li>false</rdf:li>
								<rdf:li>true</rdf:li>
								<rdf:li>false</rdf:li>
							</rdf:Seq>
						</ns:arrayOfPrimitives>
					</rdf:Description>
				`)
				assert.lengthOf(output.arrayOfPrimitives, 4)
				assert.strictEqual(output.arrayOfPrimitives[0], true)
				assert.strictEqual(output.arrayOfPrimitives[1], false)
				assert.strictEqual(output.arrayOfPrimitives[2], true)
				assert.strictEqual(output.arrayOfPrimitives[3], false)
			})

			it('integers', () => {
				let output = XmpParser.parse(`
					<rdf:Description>
						<ns:arrayOfPrimitives>
							<rdf:Seq>
								<rdf:li>11</rdf:li>
								<rdf:li>22</rdf:li>
								<rdf:li>33</rdf:li>
							</rdf:Seq>
						</ns:arrayOfPrimitives>
					</rdf:Description>
				`)
				assert.lengthOf(output.arrayOfPrimitives, 3)
				assert.strictEqual(output.arrayOfPrimitives[0], 11)
				assert.strictEqual(output.arrayOfPrimitives[1], 22)
				assert.strictEqual(output.arrayOfPrimitives[2], 33)
			})

			it('floats', () => {
				let output = XmpParser.parse(`
					<rdf:Description>
						<ns:arrayOfPrimitives>
							<rdf:Seq>
								<rdf:li>1.1</rdf:li>
								<rdf:li>2.2</rdf:li>
								<rdf:li>3.3</rdf:li>
							</rdf:Seq>
						</ns:arrayOfPrimitives>
					</rdf:Description>
				`)
				assert.lengthOf(output.arrayOfPrimitives, 3)
				assert.strictEqual(output.arrayOfPrimitives[0], 1.1)
				assert.strictEqual(output.arrayOfPrimitives[1], 2.2)
				assert.strictEqual(output.arrayOfPrimitives[2], 3.3)
			})

			it('mixed types', () => {
				let output = XmpParser.parse(`
					<rdf:Description>
						<ns:arrayOfPrimitives>
							<rdf:Seq>
								<rdf:li>one</rdf:li>
								<rdf:li>31</rdf:li>
								<rdf:li>0.98</rdf:li>
								<rdf:li>true</rdf:li>
								<rdf:li>false</rdf:li>
								<rdf:li>six</rdf:li>
							</rdf:Seq>
						</ns:arrayOfPrimitives>
					</rdf:Description>
				`)
				assert.lengthOf(output.arrayOfPrimitives, 6)
				assert.strictEqual(output.arrayOfPrimitives[0], 'one')
				assert.strictEqual(output.arrayOfPrimitives[1], 31)
				assert.strictEqual(output.arrayOfPrimitives[2], 0.98)
				assert.strictEqual(output.arrayOfPrimitives[3], true)
				assert.strictEqual(output.arrayOfPrimitives[4], false)
				assert.strictEqual(output.arrayOfPrimitives[5], 'six')
			})

		})

	})

	describe('object tag', () => {

		describe('basic object properties', () => {

			it('object tag is property in root (pair tags)', () => {
				let output = XmpParser.parse(`
					<rdf:Description>
						<ns:theObject ns:action="saved" ns:instanceID="943e9954eba8"></ns:theObject>
					</rdf:Description>
				`)
				assert.hasAllKeys(output, ['theObject'])
				assert.isObject(output.theObject);
			})

			it('object tag is property in root (self closing tag)', () => {
				let output = XmpParser.parse(`
					<rdf:Description>
						<ns:theObject ns:action="saved" ns:instanceID="943e9954eba8"/>
					</rdf:Description>
				`)
				assert.hasAllKeys(output, ['theObject'])
				assert.isObject(output.theObject);
			})

			it('two object tags are properties in root', () => {
				let output = XmpParser.parse(`
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
				assert.hasAllKeys(output, ['firstObject', 'secondObject'])
				assert.isObject(output.firstObject);
				assert.isObject(output.secondObject);
			})

			it('object tag contains all properties', () => {
				let output = XmpParser.parse(`
					<rdf:Description>
						<ns:theObject
							ns:action="saved"
							ns:instanceID="xmp.iid:667349ef-da53-a042-9298-943e9954eba8"
							ns:when="2017-05-07T17:32:06+02:00"
							ns:softwareAgent="Adobe Photoshop Lightroom 6.9 (Windows)"
							ns:changed="/">
						</ns:theObject>
					</rdf:Description>
				`)
				assert.hasAllKeys(output.theObject, ['action', 'instanceID', 'when', 'softwareAgent', 'changed'])
			})

			it('two object tags contains all properties', () => {
				let output = XmpParser.parse(`
					<rdf:Description>
						<ns:firstObject
							ns:action="derived"
							ns:parameters="saved to new location">
						</ns:firstObject>
						<ns:secondObject
							ns:action="saved"
							ns:instanceID="xmp.iid:667349ef-da53-a042-9298-943e9954eba8"
							ns:when="2017-05-07T17:32:06+02:00"
							ns:softwareAgent="Adobe Photoshop Lightroom 6.9 (Windows)"
							ns:changed="/">
						</ns:secondObject>
					</rdf:Description>
				`)
				assert.hasAllKeys(output.firstObject, ['action', 'parameters'])
				assert.hasAllKeys(output.secondObject, ['action', 'instanceID', 'when', 'softwareAgent', 'changed'])
			})

			it('object tag has proper primitive types', () => {
				let output = XmpParser.parse(`
					<rdf:Description>
						<ns:theObject
							ns:objString="the string inside object"
							ns:objInteger="42"
							ns:objFloat="0.04"
							ns:objBoolTrue="true"
							ns:objBoolFalse="false">
						</ns:theObject>
					</rdf:Description>
				`)
				assert.isString(output.theObject.objString)
				assert.isNumber(output.theObject.objInteger)
				assert.isNumber(output.theObject.objFloat)
				assert.isBoolean(output.theObject.objBoolTrue)
				assert.isBoolean(output.theObject.objBoolFalse)
			})

			it('object tag contains proper values', () => {
				let output = XmpParser.parse(`
					<rdf:Description>
						<ns:theObject
							ns:objString="the string inside object"
							ns:objInteger="42"
							ns:objFloat="0.04"
							ns:objBoolTrue="true"
							ns:objBoolFalse="false">
						</ns:theObject>
					</rdf:Description>
				`)
				assert.strictEqual(output.theObject.objString, 'the string inside object')
				assert.strictEqual(output.theObject.objInteger, 42)
				assert.strictEqual(output.theObject.objFloat, 0.04)
				assert.strictEqual(output.theObject.objBoolTrue, true)
				assert.strictEqual(output.theObject.objBoolFalse, false)
			})

		})

		describe('object with attributes and children', () => {

			it('test 1', () => {
				let output = XmpParser.parse(`<rdf:Description>
					<ns:tagObject ns:objString="the string">42</ns:tagObject>
				</rdf:Description>`)
				assert.isObject(output.tagObject)
				assert.hasAllKeys(output.tagObject, ['objString', CHILDREN_PROP])
				assert.strictEqual(output.tagObject.objString, 'the string')
				assert.strictEqual(output.tagObject[CHILDREN_PROP], 42)
			})

			it('test 2', () => {
				let output = XmpParser.parse(`<rdf:Description>
					<ns:tagObject
					ns:objString="the string"
					ns:objBool="true">
						0.78
					</ns:tagObject>
				</rdf:Description>`)
				assert.isObject(output.tagObject)
				assert.hasAllKeys(output.tagObject, ['objString', 'objBool', CHILDREN_PROP])
				assert.strictEqual(output.tagObject.objString, 'the string')
				assert.strictEqual(output.tagObject[CHILDREN_PROP], 0.78)
			})

			it('test 3', () => {
				let output = XmpParser.parse(`<rdf:Description>
					<ns:tagObject
					ns:objString="the string"
					ns:objBool="true">
						children string
					</ns:tagObject>
				</rdf:Description>`)
				assert.isObject(output.tagObject)
				assert.hasAllKeys(output.tagObject, ['objString', 'objBool', CHILDREN_PROP])
				assert.strictEqual(output.tagObject.objString, 'the string')
				assert.strictEqual(output.tagObject[CHILDREN_PROP], 'children string')
			})

			it('test 4', () => {
				let output = XmpParser.parse(`<rdf:Description>
					<ns:tagObject
					ns:objString="attrval"
					ns:objNumber="42">
						children string
					</ns:tagObject>
				</rdf:Description>`)
				assert.isObject(output.tagObject)
				assert.hasAllKeys(output.tagObject, ['objString', 'objNumber', CHILDREN_PROP])
				assert.strictEqual(output.tagObject.objString, 'attrval')
				assert.strictEqual(output.tagObject.objNumber, 42)
				assert.strictEqual(output.tagObject[CHILDREN_PROP], 'children string')
			})

		})

	})


	describe('compounds & complex synthetic tests', () => {

		it('combined attrs + primitive tags', () => {
			let output = XmpParser.parse(`
				<rdf:Description
				ns:attrString="the attr string"
				ns:attrBoolTrue="true"
				ns:attrBoolFale="false"
				ns:attrInteger="42"
				ns:attrFloat="0.04">
					<ns:tagString>the tag string</ns:tagString>
					<ns:tagFloat>0.04</ns:tagFloat>
					<ns:tagInteger>42</ns:tagInteger>
					<ns:tagBoolTrue>true</ns:tagBoolTrue>
					<ns:tagBoolFalse>false</ns:tagBoolFalse>
				</rdf:Description>
			`)
			assert.strictEqual(output.attrString, 'the attr string')
			assert.strictEqual(output.attrFloat, 0.04)
			assert.strictEqual(output.attrInteger, 42)
			assert.strictEqual(output.attrBoolTrue, true)
			assert.strictEqual(output.attrBoolFale, false)
			assert.strictEqual(output.tagString, 'the tag string')
			assert.strictEqual(output.tagFloat, 0.04)
			assert.strictEqual(output.tagInteger, 42)
			assert.strictEqual(output.tagBoolTrue, true)
			assert.strictEqual(output.tagBoolFalse, false)
		})

		it('combined attrs + array tag', () => {
			let output = XmpParser.parse(`
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
			assert.strictEqual(output.attrString, 'the attr string')
			assert.strictEqual(output.attrInteger, 42)
			assert.isArray(output.tagArray)
			assert.lengthOf(output.tagArray, 2)
			assert.deepEqual(output.tagArray, ['one', 'two'])
		})

		it('combined primitive tags + array tag', () => {
			let output = XmpParser.parse(`
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
			assert.strictEqual(output.tagFloat, 0.04)
			assert.strictEqual(output.tagBoolTrue, true)
			assert.isArray(output.tagArray)
			assert.lengthOf(output.tagArray, 2)
			assert.deepEqual(output.tagArray, ['one', 'two'])
		})

		it('combined attrs + primitive tags + array tag', () => {
			let output = XmpParser.parse(`
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
			assert.strictEqual(output.attrString, 'the attr string')
			assert.strictEqual(output.attrInteger, 42)
			assert.strictEqual(output.tagFloat, 0.04)
			assert.strictEqual(output.tagBoolTrue, true)
			assert.isArray(output.tagArray)
			assert.lengthOf(output.tagArray, 2)
			assert.deepEqual(output.tagArray, ['one', 'two'])
		})

		it('combined attrs + object tag', () => {
			let output = XmpParser.parse(`
				<rdf:Description
				ns:attrString="the attr string"
				ns:attrInteger="42">
					<ns:theObject ns:action="derived" ns:parameters="saved to new location"/>
				</rdf:Description>
			`)
			assert.hasAllKeys(output, ['attrString', 'attrInteger', 'theObject'])
			assert.hasAllKeys(output.theObject, ['action', 'parameters'])
		})

		it('combined attrs + two object tags', () => {
			let output = XmpParser.parse(`
				<rdf:Description
				ns:attrString="the attr string"
				ns:attrInteger="42">
					<ns:firstObject ns:string="derived" ns:integer="42"></ns:firstObject>
					<ns:secondObject ns:bool="false" ns:float="0.42" />
				</rdf:Description>
			`)
			assert.hasAllKeys(output, ['attrString', 'attrInteger', 'firstObject', 'secondObject'])
			assert.hasAllKeys(output.firstObject, ['string', 'integer'])
			assert.hasAllKeys(output.secondObject, ['bool', 'float'])
		})

		it('combined primitive tags + object tag', () => {
			let output = XmpParser.parse(`
				<rdf:Description
					<ns:tagString>the attr string</ns:tagString>
					<ns:tagInteger>42</ns:tagInteger>
					<ns:theObject ns:action="derived" ns:parameters="saved to new location"/>
				</rdf:Description>
			`)
			assert.hasAllKeys(output, ['tagString', 'tagInteger', 'theObject'])
			assert.hasAllKeys(output.theObject, ['action', 'parameters'])
		})

		it('combined primitive tags + two object tags', () => {
			let output = XmpParser.parse(`
				<rdf:Description
					<ns:tagString>the attr string</ns:tagString>
					<ns:tagInteger>42</ns:tagInteger>
					<ns:firstObject ns:string="derived" ns:integer="42"></ns:firstObject>
					<ns:secondObject ns:bool="false" ns:float="0.42" />
				</rdf:Description>
			`)
			assert.hasAllKeys(output, ['tagString', 'tagInteger', 'firstObject', 'secondObject'])
			assert.hasAllKeys(output.firstObject, ['string', 'integer'])
			assert.hasAllKeys(output.secondObject, ['bool', 'float'])
		})

		it('combined primitive tags + attrs + two object tags', () => {
			let output = XmpParser.parse(`
				<rdf:Description
				ns:attrString="the attr string"
				ns:attrInteger="42">
					<ns:tagString>the attr string</ns:tagString>
					<ns:tagInteger>42</ns:tagInteger>
					<ns:firstObject ns:string="derived" ns:integer="42"></ns:firstObject>
					<ns:secondObject ns:bool="false" ns:float="0.42" />
				</rdf:Description>
			`)
			assert.hasAllKeys(output, ['attrString', 'attrInteger', 'tagString', 'tagInteger', 'firstObject', 'secondObject'])
			assert.hasAllKeys(output.firstObject, ['string', 'integer'])
			assert.hasAllKeys(output.secondObject, ['bool', 'float'])
		})

		it('array of objects', () => {
			let output = XmpParser.parse(`
				<rdf:Description>
					<ns:arrayOfObjects>
						<rdf:Seq>
							<rdf:li ns:objString="one" ns:objInteger="1"/>
							<rdf:li ns:objFloat="0.42" ns:objBool="true"></rdf:li>
						</rdf:Seq>
					</ns:arrayOfObjects>
				</rdf:Description>
			`)
			assert.hasAllKeys(output, ['arrayOfObjects'])
			assert.lengthOf(output.arrayOfObjects, 2)
			assert.hasAllKeys(output.arrayOfObjects[0], ['objString', 'objInteger'])
			assert.hasAllKeys(output.arrayOfObjects[1], ['objFloat', 'objBool'])
		})

		it('combined attrs + primitive tags + object tags + array of objects', () => {
			let output = XmpParser.parse(`
				<rdf:Description
				ns:attrString="the attr string"
				ns:attrBoolTrue="true"
				ns:attrBoolFale="false"
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
			// attrs
			assert.strictEqual(output.attrString, 'the attr string')
			assert.strictEqual(output.attrFloat, 0.04)
			assert.strictEqual(output.attrInteger, 42)
			assert.strictEqual(output.attrBoolTrue, true)
			assert.strictEqual(output.attrBoolFale, false)
			// primitive tags
			assert.strictEqual(output.tagString, 'the tag string')
			assert.strictEqual(output.tagFloat, 0.04)
			assert.strictEqual(output.tagInteger, 42)
			assert.strictEqual(output.tagBoolTrue, true)
			assert.strictEqual(output.tagBoolFalse, false)
			// array of objects
			assert.lengthOf(output.arrayOfObjects, 3)
			assert.hasAllKeys(output.arrayOfObjects[0], ['objString', 'objInteger'])
			assert.hasAllKeys(output.arrayOfObjects[1], ['objFloat', 'objBool'])
			assert.hasAllKeys(output.arrayOfObjects[2], ['objString', 'objBool'])
			// simple arrays
			assert.deepEqual(output.arrayOfStrings, ['one', 'two', 'three'])
			assert.deepEqual(output.arrayWithSingleItem, 42)
			assert.deepEqual(output.arrayOfMixedPrimitives, ['one', 31, true, 0.98])
		})

	})


	describe('newlines & spaces', () => {

		it('multiline, self closing tag', () => {
			let output = XmpParser.parse(`
				<xmpMM:DerivedFrom
					stRef:documentID="attrval"
					stRef:originalDocumentID="attrval"
				/>
			`)
			assert.isObject(output.DerivedFrom)
			assert.hasAllKeys(output.DerivedFrom, ['documentID', 'originalDocumentID'])
			assert.strictEqual(output.DerivedFrom.documentID, 'attrval')
			assert.strictEqual(output.DerivedFrom.originalDocumentID, 'attrval')
		})

		it('multiline, pair tags', () => {
			let output = XmpParser.parse(`
				<xmpMM:DerivedFrom
					stRef:documentID="attrval"
					stRef:originalDocumentID="attrval"
				></xmpMM:DerivedFrom>
			`)
			assert.isObject(output.DerivedFrom)
			assert.hasAllKeys(output.DerivedFrom, ['documentID', 'originalDocumentID'])
			assert.strictEqual(output.DerivedFrom.documentID, 'attrval')
			assert.strictEqual(output.DerivedFrom.originalDocumentID, 'attrval')
		})

		it('multiline, pair tags with attributes and children', () => {
			let output = XmpParser.parse(`
				<xmpMM:DerivedFrom
					stRef:documentID="attrval"
					stRef:originalDocumentID="attrval"
				>children</xmpMM:DerivedFrom>
			`)
			assert.isObject(output.DerivedFrom)
			assert.hasAllKeys(output.DerivedFrom, ['documentID', 'originalDocumentID', CHILDREN_PROP])
			assert.strictEqual(output.DerivedFrom.documentID, 'attrval')
			assert.strictEqual(output.DerivedFrom.originalDocumentID, 'attrval')
			assert.strictEqual(output.DerivedFrom[CHILDREN_PROP], 'children')
		})

		it('all on one line, self closing tag', () => {
			let output = XmpParser.parse(`<xmpMM:DerivedFrom stRef:documentID="attrval" stRef:originalDocumentID="attrval"/>`)
			assert.isObject(output.DerivedFrom)
			assert.hasAllKeys(output.DerivedFrom, ['documentID', 'originalDocumentID'])
			assert.strictEqual(output.DerivedFrom.documentID, 'attrval')
			assert.strictEqual(output.DerivedFrom.originalDocumentID, 'attrval')
		})

		it('all on one line, pair tags', () => {
			let output = XmpParser.parse(`<xmpMM:DerivedFrom stRef:documentID="attrval" stRef:originalDocumentID="attrval"></xmpMM:DerivedFrom>`)
			assert.isObject(output.DerivedFrom)
			assert.hasAllKeys(output.DerivedFrom, ['documentID', 'originalDocumentID'])
			assert.strictEqual(output.DerivedFrom.documentID, 'attrval')
			assert.strictEqual(output.DerivedFrom.originalDocumentID, 'attrval')
		})

		it('all on one line, pair tags with attributes and children', () => {
			let output = XmpParser.parse(`<xmpMM:DerivedFrom stRef:documentID="attrval" stRef:originalDocumentID="attrval">children</xmpMM:DerivedFrom>`)
			assert.isObject(output.DerivedFrom)
			assert.hasAllKeys(output.DerivedFrom, ['documentID', 'originalDocumentID', CHILDREN_PROP])
			assert.strictEqual(output.DerivedFrom.documentID, 'attrval')
			assert.strictEqual(output.DerivedFrom.originalDocumentID, 'attrval')
			assert.strictEqual(output.DerivedFrom[CHILDREN_PROP], 'children')
		})

	})


	describe('other random cases', () => {

		it('case 1', () => {
			let output = XmpParser.parse(`
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

			assert.strictEqual(output.string, 'the attr string')
			assert.strictEqual(output.bool, true)
			assert.strictEqual(output.anotherBool, false)
			assert.strictEqual(output.integer, 42)
			assert.strictEqual(output.float, 0.04)

			assert.strictEqual(output.tagValue, 'the tag string')
			assert.strictEqual(output.tagListWithOneItem, 'LWIR')

			assert.isObject(output.tagObject)
			assert.strictEqual(output.tagObject.instanceID, '0deb8273465e')
			assert.strictEqual(output.tagObject.documentID, '34ee041e7e1a')

			assert.isArray(output.tagListWithTwoItems)
			assert.strictEqual(output.tagListWithTwoItems[0], 'one')
			assert.strictEqual(output.tagListWithTwoItems[1], 'two')

			assert.isArray(output.arrayOfObjects)
			assert.lengthOf(output.arrayOfObjects, 2)
			assert.isObject(output.arrayOfObjects[0])
			assert.isObject(output.arrayOfObjects[1])
			assert.strictEqual(output.arrayOfObjects[0].action, 'derived')
			assert.strictEqual(output.arrayOfObjects[1].action, 'saved')
		})

		it('case 2', () => {
			let output = XmpParser.parse('<FLIR:BandName><rdf:Seq>\t<rdf:li>LWIR</rdf:li>\t</rdf:Seq>\t</FLIR:BandName>')
			assert.equal(output.BandName, 'LWIR')
		})

		it('case 3', () => {
			let output = XmpParser.parse('<FLIR:BandName><rdf:Seq>\t<rdf:li>LWIR</rdf:li>\t<rdf:li>LWIR</rdf:li>\t</rdf:Seq>\t</FLIR:BandName>')
			assert.isArray(output.BandName)
			assert.deepEqual(output.BandName, ['LWIR', 'LWIR'])
		})

		it('case 4', () => {
			let output = XmpParser.parse(`
				<crs:ToneCurve>
					<rdf:Seq>
						<rdf:li>0, 0</rdf:li>
						<rdf:li>255, 255</rdf:li>
					</rdf:Seq>
				</crs:ToneCurve>
			`)
			assert.isArray(output.ToneCurve)
			assert.deepEqual(output.ToneCurve, ['0, 0', '255, 255'])
		})

		it('case 5', () => {
			let output = XmpParser.parse(`
				<ns:onlyChildren>children string</ns:onlyChildren>
			`)
			assert.equal(output.onlyChildren, 'children string')
		})

		it('> symbol in attribute', () => {
			let output = XmpParser.parse(`
				<ns:simple ns:name="less > than">children string</ns:simple>
			`)
			assert.equal(output.simple.name, 'less > than')
			assert.equal(output.simple[CHILDREN_PROP], 'children string')
		})

		it('> in attribute, space before tag end', () => {
			let output = XmpParser.parse(`
				<ns:spaceBeforeTagEnd ns:name="less > than" >children string</ns:spaceBeforeTagEnd>
			`)
			assert.equal(output.spaceBeforeTagEnd.name, 'less > than')
			assert.equal(output.spaceBeforeTagEnd[CHILDREN_PROP], 'children string')
		})

		it('> in attribute, new line before tag end', () => {
			let output = XmpParser.parse(`
				<ns:nlBeforeTagEnd
				ns:name="less > than"
				>children string</ns:nlBeforeTagEnd>
			`)
			assert.equal(output.nlBeforeTagEnd.name, 'less > than')
			assert.equal(output.nlBeforeTagEnd[CHILDREN_PROP], 'children string')
		})

		it('> in attribute, new after tag start', () => {
			let output = XmpParser.parse(`
				<ns:nlAfterTagStart
				ns:name="less > than">children string</ns:nlAfterTagStart>
			`)
			assert.equal(output.nlAfterTagStart.name, 'less > than')
			assert.equal(output.nlAfterTagStart[CHILDREN_PROP], 'children string')
		})

		it('self closing tag-object with one attribute with > inside', () => {
			let output = XmpParser.parse(`
				<ns:object ns:name="less > than"/>
			`)
			assert.equal(output.object.name, 'less > than')
		})

	})

	describe('real world cases', () => {
		// MunchSP1919.xml
	})

})
