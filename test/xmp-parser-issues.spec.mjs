import {assert, getFile} from './test-util-core.mjs'
import Xmp from '../src/segment-parsers/xmp.mjs'


describe('Xmp - issues', () => {

		describe('#59 (regions): nested rdf:Description', () => {

			it('RegionList with single item', () => {
				let output = Xmp.parse(`
					<rdf:Description>
						<mwg-rs:Regions rdf:parseType="Resource">
							<mwg-rs:AppliedToDimensions stDim:w="1697" stDim:h="1132" stDim:unit="pixel"/>
							<mwg-rs:RegionList>
								<rdf:Bag>
									<rdf:li>
										<rdf:Description mwg-rs:Rotation="0.00000" mwg-rs:Name="Alvin the Squirrel" mwg-rs:Type="Face">
											<mwg-rs:Area stArea:h="0.55270" stArea:w="0.39405" stArea:x="0.41794" stArea:y="0.58851"/>
										</rdf:Description>
									</rdf:li>
								</rdf:Bag>
							</mwg-rs:RegionList>
						</mwg-rs:Regions>
					</rdf:Description>
				`)['mwg-rs']
				assert.isObject(output)
				assert.isObject(output.Regions)
				assert.equal(output.Regions.parseType, 'Resource')
				assert.isObject(output.Regions.AppliedToDimensions)
				assert.equal(output.Regions.AppliedToDimensions.w, 1697)
				assert.isObject(output.Regions.RegionList)
				assert.equal(output.Regions.RegionList.Name, 'Alvin the Squirrel')
				assert.equal(output.Regions.RegionList.Area.x, 0.41794)
			})

			it('RegionList with multiple items', () => {
				let output = Xmp.parse(`
					<rdf:Description>
						<mwg-rs:Regions rdf:parseType="Resource">
							<mwg-rs:AppliedToDimensions stDim:w="1697" stDim:h="1132" stDim:unit="pixel"/>
							<mwg-rs:RegionList>
								<rdf:Bag>
									<rdf:li>
										<rdf:Description mwg-rs:Rotation="0.00000" mwg-rs:Name="Alvin the Squirrel" mwg-rs:Type="Face">
											<mwg-rs:Area stArea:h="0.55270" stArea:w="0.39405" stArea:x="0.41794" stArea:y="0.58851"/>
										</rdf:Description>
									</rdf:li>
									<rdf:li>
										<rdf:Description mwg-rs:Rotation="1.00000" mwg-rs:Name="Another" mwg-rs:Type="Face">
											<mwg-rs:Area stArea:h="0.5" stArea:w="0.3" stArea:x="0.4" stArea:y="0.5"/>
										</rdf:Description>
									</rdf:li>
								</rdf:Bag>
							</mwg-rs:RegionList>
						</mwg-rs:Regions>
					</rdf:Description>
				`)['mwg-rs']
				assert.isArray(output.Regions.RegionList)
				assert.lengthOf(output.Regions.RegionList, 2)
				assert.equal(output.Regions.RegionList[0].Name, 'Alvin the Squirrel')
				assert.equal(output.Regions.RegionList[0].Area.x, 0.41794)
				assert.equal(output.Regions.RegionList[1].Name, 'Another')
				assert.equal(output.Regions.RegionList[1].Area.x, 0.4)
			})

		})

})
