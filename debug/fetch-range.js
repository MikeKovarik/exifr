//var request = require('request')
var fetch = require('node-fetch')

let url1 = 'http://localhost/test/fixtures/noexif.jpg'
let url2 = 'http://exifr.netlify.com/test/noexif.jpg'
let url3 = 'http://mutiny.cz/exifr/test/noexif.jpg'

async function fetchImage(url, offset = 0, end = 0) {
	let headers = {}
	headers.range = `bytes=${[offset, end].join('-')}`
	let res = await fetch(url, {headers})
	console.log('-------------------------------------------------------')
	console.log(url, offset, end)
    //console.log('res', res.status, res.headers)
	console.log('content-length', res.headers.get('content-length'))
	console.log('content-range ', res.headers.get('content-range'))
	let arrayBuffer = await res.arrayBuffer()
    console.log('arrayBuffer.byteLength', arrayBuffer.byteLength)
    //console.log('buffer', Buffer.from(arrayBuffer))
    //console.log('string', Buffer.from(arrayBuffer).toString())
}

async function main() {
	await fetchImage(url1, 0, 12345)
	await fetchImage(url2, 0, 12345)
	await fetchImage(url3, 0, 12345)
	await fetchImage(url1, 4000, 9000)
	await fetchImage(url2, 4000, 9000)
	await fetchImage(url3, 4000, 9000)
	await fetchImage(url1, 12345, 22333)
	await fetchImage(url2, 12345, 22333)
	await fetchImage(url3, 12345, 22333)
}

main()