export async function fetchUrlAsArrayBuffer(url) {
	return fetch(url).then(res => res.arrayBuffer())
}

export async function readBlobAsArrayBuffer(blob) {
	return new Promise((resolve, reject) => {
		let reader = new FileReader()
		reader.onloadend = () => resolve(reader.result || new ArrayBuffer)
		reader.onerror = reject
		reader.readAsArrayBuffer(blob)
	})
}