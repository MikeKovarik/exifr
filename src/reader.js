import {BufferView, isBrowser, isNode, isWorker} from './util/BufferView.js'
import createOptions from './options.js'
// TODO: use these bare functions when ChunkedReader is not included in the build
import {readBlobAsArrayBuffer, fetchUrlAsArrayBuffer} from './file-readers/essentials.js'
// TODO: make optional
import {FsReader} from './file-readers/FsReader.js'
import {Base64Reader} from './file-readers/Base64Reader.js'
import {UrlFetcher} from './file-readers/UrlFetcher.js'
import {BlobReader} from './file-readers/BlobReader.js'
export {FsReader, Base64Reader, UrlFetcher, BlobReader}

// TODO: - API for including 3rd party XML parser

export default class Reader {

	constructor(options) {
		this.options = createOptions(options)
	}

	async read(arg) {
		//global.recordBenchTime(`exifr.read()`)
		if (typeof arg === 'string')
			await this.readString(arg)
		else if (isBrowser && !isWorker && arg instanceof HTMLImageElement)
			await this.readString(arg.src)
		else if (arg instanceof Uint8Array || arg instanceof ArrayBuffer || arg instanceof DataView)
			this.file = new BufferView(arg)
		else if (isBrowser && arg instanceof Blob)
			await this.readBlob(arg)
		else
			throw new Error('Invalid input argument')
	}

	async readString(string) {
		if (isBase64Url(string))
			await this.readBase64(string)
		else if (isBrowser)
			await this.readUrl(string)
		else if (isNode)
			await this.readFileFromDisk(string)
		else
			throw new Error('Invalid input argument')
	}

	async readBlob(blob) {
		// TODO: use readBlobAsArrayBuffer() if ChunkedReader is not bundled
		this.file = new BlobReader(blob, this.options)
		await this.file.read()
	}

	async readUrl(url) {
		// TODO: use fetchUrlAsArrayBuffer() if ChunkedReader is not bundled
		this.file = new UrlFetcher(url, this.options)
		await this.file.read()
	}

	async readBase64(base64) {
		this.file = new Base64Reader(base64, this.options)
		await this.file.read()
	}

	async readFileFromDisk(filePath) {
		this.file = new FsReader(filePath, this.options)
		await this.file.read()
	}

}




// HELPER FUNCTIONS

function isBase64Url(string) {
	return string.startsWith('data:')
		|| string.length > 10000 // naive
	//	|| string.startsWith('/9j/') // expects JPG to always start the same
}

