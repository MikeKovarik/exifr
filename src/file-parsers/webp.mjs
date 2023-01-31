import { FileParserBase } from '../parser.mjs'
import { fileParsers } from '../plugins.mjs'


export class WebpFileParser extends FileParserBase {

	static type = 'webp'

	static canHandle(file, firstTwoBytes) {
		return firstTwoBytes === 0x5249
			&& file.getUint32(0) === 0x52494646
			&& file.getUint32(8) === 0x57454250
	}

	async parse() {
		let { tiff, xmp, icc } = this.options

		const chunks = {}
		const hasChunks = { XMP: false, EXIF: false, ICC: false }

		let head = 0x0C;
		while (1) {
			await this.file.ensureChunk(head, 8)
			if (this.file.chunked && !this.file.available(head, 8) || head + 8 > this.file.byteLength)
				break

			const type = this.file.getString(head, 4)
			const len = this.file.getUint32(head + 4, true)

			if (type === "VP8X") {
				await this.file.ensureChunk(head + 4 + 4, 1)
				const flag = this.file.getUint8(head + 4 + 4, 1);
				// hasChunks.ANIM  = (flag & 1 << 1) >> 1
				hasChunks.XMP   = (flag & 1 << 2) >> 2 && xmp.enabled
				hasChunks.EXIF  = (flag & 1 << 3) >> 3 && tiff.enabled
				// hasChunks.ALPHA = (flag & 1 << 4) >> 4
				hasChunks.ICC   = (flag & 1 << 5) >> 5 && icc.enabled
			}

			chunks[type.trim()] = { head: head + 8, len: len - 8 }

			head += len + 8
			head += head % 2
			
			let foundAllChunks = true;
			for (const key in hasChunks) 
				if (hasChunks[key] && !chunks[key])
					foundAllChunks = false

			if (foundAllChunks) break;
		}

		if (tiff.enabled && chunks.EXIF != undefined) {
			await this.file.ensureChunk(chunks.EXIF.head, chunks.EXIF.len)
			this.createParser('tiff', this.file.subarray(chunks.EXIF.head, chunks.EXIF.len))
		}
		if (xmp.enabled && chunks.XMP != undefined) {
			await this.file.ensureChunk(chunks.XMP.head, chunks.XMP.len)
			this.createParser('xmp', this.file.subarray(chunks.XMP.head, chunks.XMP.len))
		}
		if (icc.enabled && chunks.ICCP != undefined) {
			await this.file.ensureChunk(chunks.ICCP.head, chunks.ICCP.len)
			this.createParser('icc', this.file.subarray(chunks.ICCP.head, chunks.ICCP.len))
		}
	}
}

fileParsers.set('webp', WebpFileParser)