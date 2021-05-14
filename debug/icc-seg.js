// node --experimental-modules enumerate-segments.js
import {promises as fs} from 'fs'
import {BufferView} from '../src/util/BufferView.js'
import Icc from '../src/segment-parsers/icc.js'
import '../src/dicts/icc-keys.js'
import '../src/dicts/icc-values.js'

fs.readFile('../test/fixtures/icc/USWebCoatedSWOP.icc')
	.then(async buffer => {
		let view = new BufferView(buffer)
		let parser = new Icc(view, {
			translateKeys: true,
			translateValues: true,
		})
		const output = await parser.parse()
		console.log('output', output)
	})
