export function fixIeSubclassing(target, Class, methods = [], getters = []) {
	// Hack to get IE11 to work. IE11 has builtin Map but it doesn't support subclassing.
	// PluginList doesn't change behavior of .get(), we just add checks that throw if key was not found.
	// IE wont throw these errors but will work. I'm ok with this regression.
	// We just need to copy additional custom method.
	methods.forEach(key => {
		if (target[key] === undefined) target[key] = Class.prototype[key]
	})
	getters.forEach(key => {
		let targetDesc = Object.getOwnPropertyDescriptor(target, key)
		if (targetDesc === undefined) {
			let protoDesc = Object.getOwnPropertyDescriptor(Class.prototype, key)
			Object.defineProperty(target, key, protoDesc)
		}
	})
}